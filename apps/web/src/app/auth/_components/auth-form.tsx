"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

type AuthMode = "login" | "signup";

const copy = {
  login: {
    eyebrow: "メールとパスワードでログイン",
    title: "ログイン",
    description: "登録済みのメールアドレスとパスワードを入力してください。",
    buttonLabel: "ログインする",
    switchText: "はじめての方は ",
    switchLinkLabel: "新規登録へ",
    switchHref: "/auth/signup",
    statusPlaceholder: "まだ送信していません。次のステップでSupabase Authとつなぎます。",
  },
  signup: {
    eyebrow: "無料診断の利用開始",
    title: "新規登録",
    description: "メールアドレスとパスワードを設定して診断を始めましょう。",
    buttonLabel: "登録して進む",
    switchText: "すでに登録済みの方は ",
    switchLinkLabel: "ログインへ",
    switchHref: "/auth/login",
    statusPlaceholder: "まだ送信していません。次のステップでSupabase Authとつなぎます。",
  },
} satisfies Record<
  AuthMode,
  {
    eyebrow: string;
    title: string;
    description: string;
    buttonLabel: string;
    switchText: string;
    switchLinkLabel: string;
    switchHref: string;
    statusPlaceholder: string;
  }
>;

export function AuthForm({ mode }: { mode: AuthMode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const content = copy[mode];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("入力を受け付けました。次のステップでSupabase Authと接続します。");
  };

  return (
    <div className="auth-card">
      <div className="auth-card-head">
        <p className="auth-eyebrow">{content.eyebrow}</p>
        <h1 className="auth-title">{content.title}</h1>
        <p className="auth-desc">{content.description}</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor={`${mode}-email`}>メールアドレス</label>
          <input
            id={`${mode}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sample@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor={`${mode}-password`}>パスワード</label>
          <input
            id={`${mode}-password`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6文字以上で入力してください"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
            required
          />
          <p className="helper-text weak">数字と英字を混ぜるとより安全です。</p>
        </div>

        <div className="auth-actions">
          <div className="auth-hint">
            <i className="fas fa-info-circle" aria-hidden="true" />
            <span>このフォームは次のステップでSupabase Authと接続予定です。</span>
          </div>
          <button type="submit" className="btn btn-primary auth-submit">
            {content.buttonLabel}
          </button>
        </div>

        <p className={`auth-status ${status ? "active" : "muted"}`} aria-live="polite">
          {status || content.statusPlaceholder}
        </p>
      </form>

      <div className="auth-switch">
        <p>
          {content.switchText}
          <Link href={content.switchHref} className="auth-switch-link">
            {content.switchLinkLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
