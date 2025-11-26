'use client';

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";

type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

type AuthNotice = {
  text: string;
  tone: "success" | "info" | "error";
};

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const initialMessages: ChatMessage[] = [
  {
    role: "ai",
    text: "ここではダミーの会話を表示しています。後続の実装で本番の処理に置き換えます。",
  },
  {
    role: "ai",
    text: "資料アップロードとチャットを同じ画面で確認する骨組みだけを用意しています。",
  },
];

function WorkspacePageContent() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [authNotice, setAuthNotice] = useState<AuthNotice | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth");
  const searchParamsString = searchParams.toString();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSend = () => {
    const body = input.trim();
    if (!body) return;

    const text = selectedFile
      ? `${body}\n\n【添付予定】${selectedFile.name}`
      : body;

    const userMessage: ChatMessage = { role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "仮の回答です。正式な診断処理と文面は今後差し替えます。",
        },
      ]);
    }, 420);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setStatus("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setStatus("ファイルは8MB以下にしてください。");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0] ?? null;
    setStatus("");

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setStatus("ファイルは8MB以下にしてください。");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const resetMessages = () => {
    setMessages(initialMessages);
    setInput("");
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

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
              <p className="diagnosis-eyebrow">ワークスペース（ダミー）</p>
              <h1 className="diagnosis-title">資料アップロード + チャットの骨組み</h1>
              <p className="diagnosis-lead">
                「無料診断を開始」で開くポップを参考に、1画面へまとめた試作ページです。
                現時点では見た目と配置だけを確認できます。
              </p>
              <div className="diagnosis-hero-actions">
                <span className="diagnosis-url">URL: /workspace</span>
                <Link href="/" className="btn btn-secondary">
                  トップへ戻る
                </Link>
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
                    後続でAI処理に渡す想定の枠です。今は見た目のみで動きます。
                    PDFや画像をドラッグ＆ドロップ、またはクリックで選択できます。
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
                  <h2 className="diagnosis-panel-title">AIとのやりとり（ダミー）</h2>
                  <p className="diagnosis-panel-desc">
                    ポップで表示していたチャット画面をそのままページ化しています。
                    送信すると仮の回答が返るだけの簡易表示です。
                  </p>
                </div>
                <span className="diagnosis-chip ghost">表示確認用</span>
              </div>

              <div className="chat-messages">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}-${message.text.slice(0, 6)}`}
                    className={`chat-message ${message.role}`}
                  >
                    <div className="chat-meta">{message.role === "ai" ? "AI" : "ユーザー"}</div>
                    <div className="chat-text">{message.text}</div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="chat-empty">ここにダミーの会話が並びます。</div>
                )}
              </div>

              <div className="chat-input-area">
                <div className="chat-input-header">
                  <span className="status-dot" />
                  <p className="chat-hint">
                    実際の処理は未接続です。見た目とレイアウトの確認だけ行えます。
                  </p>
                </div>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  rows={3}
                  placeholder="ここに送信したい内容を入力（ダミー返信が返ります）"
                />
                <div className="chat-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSend}
                    disabled={!input.trim()}
                  >
                    送信
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={resetMessages}>
                    履歴をリセット
                  </button>
                  {selectedFile ? (
                    <span className="chat-inline-note">添付予定: {selectedFile.name}</span>
                  ) : (
                    <span className="chat-inline-note">添付なしのまま送信できます。</span>
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
