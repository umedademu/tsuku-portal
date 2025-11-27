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
  const router = useRouter();
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth");
  const searchParamsString = searchParams.toString();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogout = async () => {
    if (loggingOut) return;
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
    if (!body || loading) return;
    if (remainingFree <= 0) {
      setChatNotice("無料枠が0回になっています。プラン選択ページに進む想定です。");
      return;
    }
    if (selectedFile && !selectedFileData) {
      setStatus("ファイルの読み込みが終わるまでお待ちください。");
      return;
    }

    const text = selectedFile
      ? `${body}\n\n【添付ファイル】${selectedFile.name}`
      : body;
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

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setRemainingFree(nextRemaining);
    setChatNotice("");
    setStatus("AIが回答を作成しています...");
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
      setMessages((prev) => [...prev, { role: "ai", text: data.message as string }]);
      setStatus("");
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "AIの回答生成に失敗しました。";
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

  const authHeadline = !authReady
    ? "ログイン状態を確認しています..."
    : userEmail
      ? `${userEmail} でログイン中です`
      : "まだログインしていません";

  const authDescription = authStateMessage
    ? authStateMessage
    : !authReady
      ? "確認中です。少しお待ちください。"
      : userEmail
        ? "このまま診断を進められます。"
        : "ログインが必要です。トップページに戻って再度お試しください。";
  const usedFree = FREE_LIMIT - remainingFree;
  const isQuotaEmpty = remainingFree <= 0;
  const usageRate = Math.min(100, Math.round((usedFree / FREE_LIMIT) * 100));

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
      <header className="diagnosis-hero">
        <div className="container">
          <div className="diagnosis-hero-box">
            <div>
              <p className="diagnosis-eyebrow">ワークスペース（試験版）</p>
              <h1 className="diagnosis-title">資料アップロード + チャットの骨組み</h1>
              <p className="diagnosis-lead">
                「無料診断を開始」で開くポップを参考に、1画面へまとめた試作ページです。
                チャットはGeminiに接続済みで実際の返答が返ります。無料枠や決済はまだ表示のみです。
              </p>
              <div className="diagnosis-hero-actions">
                <span className="diagnosis-url">URL: /workspace</span>
                <Link href="/" className="btn btn-secondary">
                  トップへ戻る
                </Link>
              </div>
              <div className="auth-state-banner">
                <div className="auth-state-texts">
                  <p className="auth-state-label">ログイン状態</p>
                  <p className="auth-state-main">{authHeadline}</p>
                  <p className={`auth-state-note ${authStateMessage ? "error" : ""}`}>{authDescription}</p>
                </div>
                <div className="auth-state-actions">
                  {userEmail && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleLogout}
                      disabled={loggingOut}
                    >
                      {loggingOut ? "ログアウト中..." : "ログアウト"}
                    </button>
                  )}
                </div>
              </div>
              <div className="usage-banner">
                <div className="usage-texts">
                  <p className="diagnosis-eyebrow">無料診断の残り（ダミー表示）</p>
                  <p className="usage-main">
                    あと <strong>{remainingFree}</strong> / {FREE_LIMIT} 回
                  </p>
                  <p className={`usage-note ${isQuotaEmpty ? "alert" : ""}`}>
                    送信するたびに1回減ります。ページを閉じると元に戻ります。
                  </p>
                  <p className="usage-note">本実装ではサーバーの値と連動させます。</p>
                </div>
                <div className="usage-meter" aria-label="無料枠の進捗">
                  <div className="usage-meter-track">
                    <div className="usage-meter-bar" style={{ width: `${usageRate}%` }} />
                  </div>
                  <span className="usage-meter-caption">消化 {usedFree} / {FREE_LIMIT}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="diagnosis-main">
        <div className="container">
          <div className="diagnosis-grid">
            <section className="diagnosis-panel">
              <div className="diagnosis-panel-head">
                <div>
                  <p className="diagnosis-eyebrow">資料アップロード枠</p>
                  <h2 className="diagnosis-panel-title">図面や見積もりの添付</h2>
                  <p className="diagnosis-panel-desc">
                    添付したPDFや画像もGeminiに渡します。ファイル保存や残数管理はまだ仮のままです。
                    ドラッグ＆ドロップ、またはクリックで選択できます。
                  </p>
                </div>
                {selectedFile ? (
                  <span className="diagnosis-chip">選択済み</span>
                ) : (
                  <span className="diagnosis-chip ghost">任意</span>
                )}
              </div>

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
                      <p className="upload-label">ここにドラッグ＆ドロップ</p>
                      <span className="upload-hint">クリックでも選択できます（8MBまで）</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="diagnosis-meta">
                <span>想定ファイル: PDF / 画像</span>
                {selectedFile ? (
                  <span className="meta-accent">現在: {selectedFile.name}</span>
                ) : (
                  <span className="meta-muted">添付なし</span>
                )}
              </div>
              {status && <p className="diagnosis-status">{status}</p>}
            </section>

            <section className="diagnosis-panel chat-panel">
              <div className="diagnosis-panel-head">
                <div>
                  <p className="diagnosis-eyebrow">チャット枠</p>
                  <h2 className="diagnosis-panel-title">AIとのやりとり（Gemini接続）</h2>
                  <p className="diagnosis-panel-desc">
                    ポップで表示していたチャット画面をそのままページ化しています。
                    Gemini 2.5 Proに送信し、そのまま回答が返ります。無料枠カウントは表示のみです。
                  </p>
                </div>
                <span className="diagnosis-chip ghost">AI応答確認中</span>
              </div>

              <div className="chat-usage">
                <div className="chat-usage-info">
                  <span className={`quota-pill ${isQuotaEmpty ? "empty" : ""}`}>
                    残り {remainingFree} / {FREE_LIMIT} 回（カウントのみダミー）
                  </span>
                  <p className="chat-usage-note">
                    送信するたびに1回減ります。実際はサーバーの残数と連動させます。
                  </p>
                </div>
                <span className="chat-usage-chip">
                  {isQuotaEmpty ? "プラン案内に切り替えます" : "AI応答は本番（GREEN固定）、無料枠は表示のみ"}
                </span>
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

              <div className="chat-messages">
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

              <div className="chat-input-area">
                <div className="chat-input-header">
                  <span className="status-dot" />
                  <p className="chat-hint">
                    Geminiに接続済みです。無料枠や決済のカウントはまだダミー表示です。
                  </p>
                </div>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  rows={3}
                  placeholder="ここに送信したい内容を入力（Geminiが返答します）"
                />
                <div className="chat-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSend}
                    disabled={!input.trim() || isQuotaEmpty || loading}
                  >
                    {isQuotaEmpty ? "残り0回のため送信不可" : loading ? "送信中..." : "送信"}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={resetMessages}>
                    履歴をリセット
                  </button>
                  {selectedFile ? (
                    <span className="chat-inline-note">添付予定: {selectedFile.name}</span>
                  ) : (
                    <span className="chat-inline-note">添付なしのまま送信できます。</span>
                  )}
                  {isQuotaEmpty && (
                    <Link href="/checkout/plan" className="btn btn-secondary">
                      プランを確認（ダミー）
                    </Link>
                  )}
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
