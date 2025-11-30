'use client';

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";

import { supabaseBrowserClient } from "@/lib/supabase-client";

type ChatMessage = {
  role: "user" | "ai";
  text: string;
  pending?: boolean;
};

type AuthNotice = {
  text: string;
  tone: "success" | "info" | "error";
};

type FileData = {
  name: string;
  base64: string;
  mimeType: string;
};

type GeminiPartPayload = {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
};

type GeminiHistoryPayload = {
  role: "user" | "model";
  parts: GeminiPartPayload[];
};

type ChatBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "divider" };

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const FREE_LIMIT = 3;
const CURRENT_PLAN = "green";
const MIN_TEXTAREA_HEIGHT = 48;
const MAX_TEXTAREA_LINES = 8;

const normalizeAiText = (text: string) =>
  text
    .replace(/\r/g, "\n")
    .replace(/---+/g, "\n---\n")
    .replace(/(\S)(#{1,6}\s)/g, "$1\n$2")
    .replace(/(\S)\s+(\d+\.\s+)/g, "$1\n$2")
    .replace(/(\S)\s+([*-]\s+)/g, "$1\n$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const splitChatBlocks = (rawText: string): ChatBlock[] => {
  const normalized = normalizeAiText(rawText);
  if (!normalized) return [];

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !/^#+$/.test(line));

  const blocks: ChatBlock[] = [];

  for (let i = 0; i < lines.length;) {
    const line = lines[i];

    if (line === "---") {
      blocks.push({ type: "divider" });
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
    i++;
  }

  return blocks;
};

const renderInline = (text: string): ReactNode[] =>
  text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={`b-${index}`}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 1) {
        return <em key={`i-${index}`}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={`c-${index}`}>{part.slice(1, -1)}</code>;
      }
      return <span key={`t-${index}`}>{part}</span>;
    });

const renderAiText = (text: string) => {
  const blocks = splitChatBlocks(text);

  if (blocks.length === 0) {
    return <div className="chat-text">{text}</div>;
  }

  return (
    <div className="chat-rich-text">
      {blocks.map((block, index) => {
        if (block.type === "divider") {
          return <div key={`d-${index}`} className="chat-divider" />;
        }

        if (block.type === "heading") {
          return (
            <div key={`h-${index}`} className="chat-heading">
              {renderInline(block.text)}
            </div>
          );
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag key={`l-${index}`} className="chat-list">
              {block.items.map((item, itemIndex) => (
                <li key={`li-${itemIndex}`}>{renderInline(item)}</li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={`p-${index}`} className="chat-paragraph">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
};

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("file parse error"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => {
      reject(reader.error || new Error("file read error"));
    };
    reader.readAsDataURL(file);
  });

const buildHistoryPayload = (
  chatMessages: ChatMessage[],
  fileData: FileData | null,
): GeminiHistoryPayload[] => {
  let fileAdded = false;

  return chatMessages.map((message) => {
    const parts: GeminiPartPayload[] = [{ text: message.text }];

    if (!fileAdded && fileData && message.role === "user") {
      parts.push({
        inlineData: {
          data: fileData.base64,
          mimeType: fileData.mimeType,
        },
      });
      fileAdded = true;
    }

    return {
      role: message.role === "ai" ? "model" : "user",
      parts,
    };
  });
};

const initialMessages: ChatMessage[] = [
  {
    role: "ai",
    text: "図面や見積のファイルを添付して送ると、AIがその場で診断内容を返します。",
  },
  {
    role: "ai",
    text: "無料回数や決済まわりはまだダミーです。まずは気になる点を短く送ってみてください。",
  },
];

function WorkspacePageContent() {
  const planLabel = CURRENT_PLAN === "free" ? "FREE" : CURRENT_PLAN.toUpperCase();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileData, setSelectedFileData] = useState<FileData | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [remainingFree, setRemainingFree] = useState(FREE_LIMIT);
  const [chatNotice, setChatNotice] = useState("");
  const [authNotice, setAuthNotice] = useState<AuthNotice | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authStateMessage, setAuthStateMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth");
  const searchParamsString = searchParams.toString();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatInputAreaRef = useRef<HTMLDivElement>(null);
  const baseTextareaHeightRef = useRef<number | null>(null);
  const baseInputMarginTopRef = useRef<number | null>(null);
  const baseInputHeightRef = useRef<number | null>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSession = async () => {
      try {
        const { data, error } = await supabaseBrowserClient.auth.getSession();
        if (error) {
          throw error;
        }
        if (!cancelled) {
          setUserEmail(data.session?.user?.email ?? null);
          setAuthStateMessage("");
        }
      } catch {
        if (!cancelled) {
          setAuthStateMessage("ログイン状態の取得に失敗しました。再読み込みしてください。");
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    };

    void fetchSession();

    const { data: subscription } = supabaseBrowserClient.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUserEmail(session?.user?.email ?? null);
      setAuthStateMessage("");
      setAuthReady(true);
    });

    return () => {
      cancelled = true;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    setAccountMenuOpen(false);
  }, [userEmail]);

  useEffect(() => {
    if (!authParam) return;

    const noticeMap: Record<string, AuthNotice> = {
      login_success: {
        text: "ログインしました。診断ページを開きました。",
        tone: "success",
      },
      signup_success: {
        text: "登録が完了しました。診断を始められます。",
        tone: "success",
      },
      signup_verified: {
        text: "メール認証が完了しました。診断を続けられます。",
        tone: "success",
      },
      signup_pending: {
        text: "仮登録が完了しました。メールのリンクで本登録を完了してください。",
        tone: "info",
      },
    };

    const found = noticeMap[authParam];
    if (!found) return;

    setAuthNotice(found);
    const params = new URLSearchParams(searchParamsString);
    params.delete("auth");
    const nextPath = params.toString() ? `/workspace?${params.toString()}` : "/workspace";
    router.replace(nextPath, { scroll: false });
  }, [authParam, router, searchParamsString]);

  useEffect(() => {
    if (!authNotice) return;
    const timer = setTimeout(() => setAuthNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [authNotice]);

  useEffect(() => {
    if (!authReady) return;
    if (userEmail) return;
    router.replace("/");
  }, [authReady, router, userEmail]);

  useEffect(() => {
    const area = chatMessagesRef.current;
    if (!area) return;
    area.scrollTop = area.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    const inputArea = chatInputAreaRef.current;
    if (!textarea || !inputArea) return;

    textarea.style.height = "auto";

    const textareaStyle = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(textareaStyle.lineHeight) || 24;
    const paddingTop = parseFloat(textareaStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(textareaStyle.paddingBottom) || 0;
    const borderTop = parseFloat(textareaStyle.borderTopWidth) || 0;
    const borderBottom = parseFloat(textareaStyle.borderBottomWidth) || 0;
    const maxHeight =
      lineHeight * MAX_TEXTAREA_LINES +
      paddingTop +
      paddingBottom +
      borderTop +
      borderBottom;

    const nextHeight = Math.min(Math.max(textarea.scrollHeight, MIN_TEXTAREA_HEIGHT), maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";

    if (baseTextareaHeightRef.current === null) {
      baseTextareaHeightRef.current = nextHeight;
    }
    if (baseInputMarginTopRef.current === null) {
      const inputAreaStyle = window.getComputedStyle(inputArea);
      baseInputMarginTopRef.current = parseFloat(inputAreaStyle.marginTop) || 0;
    }
    if (baseInputHeightRef.current === null) {
      baseInputHeightRef.current = inputArea.getBoundingClientRect().height;
    }

    const baseHeight = baseTextareaHeightRef.current;
    const extraHeight = Math.max(nextHeight - baseHeight, 0);
    const baseMargin = baseInputMarginTopRef.current ?? 0;
    const nextMargin = baseMargin - extraHeight;
    inputArea.style.marginTop = `${nextMargin}px`;

    const baseInputHeight = baseInputHeightRef.current ?? 0;
    const nextInputHeight = baseInputHeight + extraHeight;
    inputArea.style.height = `${nextInputHeight}px`;
  }, [input]);

  const showMenuNotice = (text: string) => {
    setChatNotice(text);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setAccountMenuOpen(false);
    setLoggingOut(true);
    setAuthStateMessage("");

    try {
      const { error } = await supabaseBrowserClient.auth.signOut();
      if (error) {
        throw error;
      }
      setUserEmail(null);
      router.replace("/");
    } catch {
      setAuthNotice({
        text: "ログアウトに失敗しました。時間をおいて再度お試しください。",
        tone: "error",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSend = async () => {
    const body = input.trim();
    const hasBody = body.length > 0;
    const hasFile = Boolean(selectedFile);

    if ((!hasBody && !hasFile) || loading) return;
    if (remainingFree <= 0) {
      setChatNotice("無料枠が0回になっています。プラン選択ページに進む想定です。");
      return;
    }
    if (selectedFile && !selectedFileData) {
      setStatus("ファイルの読み込みが終わるまでお待ちください。");
      return;
    }

    const mainText = hasBody ? body : "添付ファイルのみ送信します。内容を確認してください。";
    const text = selectedFile
      ? `${mainText}\n\n【添付ファイル】${selectedFile.name}`
      : mainText;
    const nextRemaining = Math.max(remainingFree - 1, 0);
    const firstUserIndex = messages.findIndex((message) => message.role === "user");
    const historySource =
      firstUserIndex === -1 ? [] : messages.slice(firstUserIndex);
    const hasUserMessage = historySource.some((message) => message.role === "user");

    const userMessage: ChatMessage = { role: "user", text };
    const historyPayload = buildHistoryPayload(historySource, selectedFileData);
    const userParts: GeminiPartPayload[] = [{ text }];

    if (selectedFileData && !hasUserMessage) {
      userParts.push({
        inlineData: {
          data: selectedFileData.base64,
          mimeType: selectedFileData.mimeType,
        },
      });
    }

    setMessages((prev) => [
      ...prev,
      userMessage,
      { role: "ai", text: "Loading...", pending: true },
    ]);
    setInput("");
    setRemainingFree(nextRemaining);
    setChatNotice("");
    setStatus("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: CURRENT_PLAN,
          message: text,
          messageParts: userParts,
          history: historyPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "AIからの回答取得に失敗しました。");
      }
      setMessages((prev) => [
        ...prev.filter((message) => !message.pending),
        { role: "ai", text: data.message as string },
      ]);
      setStatus("");
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "AIの回答生成に失敗しました。";
      setMessages((prev) => prev.filter((message) => !message.pending));
      setStatus(message);
    } finally {
      setLoading(false);
      if (nextRemaining === 0) {
        setChatNotice("無料枠を使い切りました。プラン選択に進む想定です。");
      }
    }

  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setStatus("");

    if (!file) {
      setSelectedFile(null);
      setSelectedFileData(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setStatus("ファイルは8MB以下にしてください。");
      setSelectedFile(null);
      setSelectedFileData(null);
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    try {
      const base64 = await readFileAsBase64(file);
      setSelectedFileData({
        name: file.name,
        base64,
        mimeType: file.type || "application/octet-stream",
      });
    } catch {
      setStatus("ファイルの読み込みに失敗しました。もう一度お試しください。");
      setSelectedFile(null);
      setSelectedFileData(null);
      event.target.value = "";
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0] ?? null;
    setStatus("");

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setStatus("ファイルは8MB以下にしてください。");
      setSelectedFile(null);
      setSelectedFileData(null);
      return;
    }

    setSelectedFile(file);
    try {
      const base64 = await readFileAsBase64(file);
      setSelectedFileData({
        name: file.name,
        base64,
        mimeType: file.type || "application/octet-stream",
      });
    } catch {
      setStatus("ファイルの読み込みに失敗しました。もう一度お試しください。");
      setSelectedFile(null);
      setSelectedFileData(null);
    }
  };

  const resetMessages = () => {
    setMessages(initialMessages);
    setInput("");
    setChatNotice("");
    setStatus("");
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const isQuotaEmpty = remainingFree <= 0;
  const compactAuthText = !authReady
    ? "ログイン確認中です..."
    : userEmail
      ? `${userEmail} でログイン中`
      : "未ログインのためトップに戻ります";

  return (
    <div className="diagnosis-page">
      {authNotice && (
        <div className="container">
          <div className={`auth-notice ${authNotice.tone}`}>
            <div className="auth-notice-text">
              <i
                className={
                  authNotice.tone === "success"
                    ? "fas fa-check-circle"
                    : authNotice.tone === "error"
                      ? "fas fa-exclamation-circle"
                      : "fas fa-info-circle"
                }
                aria-hidden="true"
              />
              <span>{authNotice.text}</span>
            </div>
            <button
              type="button"
              className="auth-notice-close"
              onClick={() => setAuthNotice(null)}
              aria-label="通知を閉じる"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <main className="diagnosis-main">
        <div className="container">
          <div className="diagnosis-grid">
            <section className="diagnosis-panel chat-panel">
                  <div className="diagnosis-panel-head">
                    <h2 className="diagnosis-panel-title">診断AI</h2>
                    <div className="chat-auth-inline">
                      <span className={`chat-plan-tag plan-${CURRENT_PLAN}`}>{planLabel}</span>
                      {userEmail && (
                        <div
                          className={`chat-account ${accountMenuOpen ? "open" : ""}`}
                          ref={accountMenuRef}
                        >
                          <button
                            type="button"
                            className="chat-account-button"
                            onClick={() => setAccountMenuOpen((prev) => !prev)}
                            aria-expanded={accountMenuOpen}
                            aria-haspopup="true"
                          >
                            <span className="chat-auth-main">{userEmail}</span>
                            <i
                              className={`fas fa-chevron-${accountMenuOpen ? "up" : "down"}`}
                              aria-hidden="true"
                            />
                          </button>
                          {accountMenuOpen && (
                            <div className="chat-account-menu" role="menu">
                              <button
                                type="button"
                                onClick={() => {
                                  showMenuNotice("プランの変更ボタンはダミーです。まだ画面は移動しません。");
                                  setAccountMenuOpen(false);
                                }}
                                role="menuitem"
                              >
                                プランの変更
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  showMenuNotice("サブスクの停止ボタンはダミーです。まだ処理は行いません。");
                                  setAccountMenuOpen(false);
                                }}
                                role="menuitem"
                              >
                                サブスクの停止
                              </button>
                              <button
                                type="button"
                                onClick={handleLogout}
                                disabled={loggingOut}
                                role="menuitem"
                              >
                                {loggingOut ? "ログアウト中..." : "ログアウト"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

              {isQuotaEmpty && (
                <div className="plan-callout">
                  <div>
                    <p className="plan-callout-title">無料分は0回になりました</p>
                    <p className="plan-callout-text">
                      今は案内だけです。この状態でプラン選択ページ（/checkout/plan）へ進む動きに差し替える予定です。
                    </p>
                  </div>
                  <Link href="/checkout/plan" className="btn btn-primary">
                    プランを選ぶ（ダミー）
                  </Link>
                </div>
              )}

              {chatNotice && <p className="chat-notice">{chatNotice}</p>}

              <div className="chat-messages" ref={chatMessagesRef}>
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}-${message.text.slice(0, 6)}`}
                    className={`chat-message ${message.role}`}
                  >
                    <div className="chat-meta">{message.role === "ai" ? "AI" : "ユーザー"}</div>
                    {message.role === "ai" ? (
                      renderAiText(message.text)
                    ) : (
                      <div className="chat-text">{message.text}</div>
                    )}
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="chat-empty">ここにこれまでの会話が並びます。</div>
                )}
              </div>

              <div className="chat-compose">
                <div className="diagnosis-row">
                  <div className="upload-panel">
                    <div
                      className={`upload-area ${isDragging ? "dragging" : ""} ${selectedFile ? "has-file" : ""}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={openFilePicker}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                      />
                      <div className="upload-content">
                        <i
                          className={`fas ${selectedFile ? "fa-check-circle" : "fa-cloud-upload-alt"}`}
                          aria-hidden="true"
                        />
                        {selectedFile ? (
                          <div className="upload-text">
                            <p className="upload-filename">{selectedFile.name}</p>
                            <span className="upload-hint">クリックして変更できます</span>
                          </div>
                        ) : (
                          <div className="upload-text">
                            <p className="upload-label">資料アップロード枠</p>
                            <p className="upload-label">ここにドラッグ＆ドロップ</p>
                            <span className="upload-hint">想定ファイル: PDF / 画像</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {status && <p className="diagnosis-status">{status}</p>}
                  </div>

                  <div className="chat-input-panel">
                    <div className="chat-input-area" ref={chatInputAreaRef}>
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        rows={1}
                        placeholder="ここに送信したい内容を入力（Geminiが返答します）"
                      />
                      <div className="chat-actions">
                        <span className={`quota-pill ${isQuotaEmpty ? "empty" : ""}`}>
                          残り {remainingFree} / {FREE_LIMIT} 回（ダミー）
                        </span>
                        <div className="chat-actions-right">
                          <button type="button" className="btn btn-secondary" onClick={resetMessages}>
                            履歴をリセット
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSend}
                            disabled={(!input.trim() && !selectedFile) || isQuotaEmpty || loading}
                          >
                            {isQuotaEmpty ? "残り0回のため送信不可" : loading ? "送信中..." : "送信"}
                          </button>
                          {isQuotaEmpty && (
                            <Link href="/checkout/plan" className="btn btn-secondary">
                              プランを確認（ダミー）
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="diagnosis-page">読み込み中です…</div>}>
      <WorkspacePageContent />
    </Suspense>
  );
}
