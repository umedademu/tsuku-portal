"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { supabaseBrowserClient } from "@/lib/supabase-client";

type AuthMode = "login" | "signup";
type StatusTone = "muted" | "info" | "error" | "success";

const copy = {
  login: {
    eyebrow: "メールとパスワードでログイン",
    title: "ログイン",
    description: "登録済みのメールアドレスとパスワードを入力してください。",
    buttonLabel: "ログインする",
    switchText: "はじめての方は ",
    switchLinkLabel: "新規登録へ",
    switchHref: "/auth/signup",
    statusPlaceholder: "送信するとSupabaseで認証します。",
  },
  signup: {
    eyebrow: "無料診断の利用開始",
    title: "新規登録",
    description: "メールアドレスとパスワードを設定して診断を始めましょう。",
    buttonLabel: "登録して進む",
    switchText: "すでに登録済みの方は ",
    switchLinkLabel: "ログインへ",
    switchHref: "/auth/login",
    statusPlaceholder: "送信すると登録が始まります。",
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

const translateAuthError = (error: unknown) => {
  const fallback = "認証に失敗しました。時間をおいてもう一度お試しください。";
  if (error && typeof error === "object" && "message" in error) {
    const raw = (error as { message?: unknown }).message;
    const message = typeof raw === "string" ? raw : "";
    if (message.includes("Invalid login credentials")) {
      return "メールアドレスまたはパスワードが正しくありません。";
    }
    if (message.includes("Email not confirmed")) {
      return "メール認証がまだ完了していません。届いたメールをご確認ください。";
    }
    if (message.includes("User already registered")) {
      return "このメールアドレスは登録済みです。ログインをお試しください。";
    }
    if (message.includes("Password should be at least 6 characters")) {
      return "パスワードは6文字以上で入力してください。";
    }
  }
  return fallback;
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("muted");
  const [loading, setLoading] = useState(false);

  const content = copy[mode];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setStatus("送信中です...");
    setStatusTone("info");
    setLoading(true);

    try {
      if (mode === "signup") {
        const callbackUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined;
        const { data, error } = await supabaseBrowserClient.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: callbackUrl,
          },
        });
        if (error) {
          throw error;
        }

        const needEmail = !data.session;
        const next = needEmail ? "/?auth=signup_pending" : "/?auth=signup_success";
        router.push(next);
        return;
      }

      const { error } = await supabaseBrowserClient.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw error;
      }
      router.push("/?auth=login_success");
    } catch (error) {
      const message = translateAuthError(error);
      setStatus(message);
      setStatusTone("error");
    } finally {
      setLoading(false);
    }
  };

  const statusClass =
    statusTone === "muted" && !status
      ? "muted"
      : statusTone === "error"
        ? "error"
        : statusTone === "success"
          ? "success"
          : "";

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
            onChange={(e) => {
              setEmail(e.target.value);
              if (statusTone === "error") {
                setStatus("");
                setStatusTone("muted");
              }
            }}
            placeholder="sample@example.com"
            autoComplete="email"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor={`${mode}-password`}>パスワード</label>
          <input
            id={`${mode}-password`}
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (statusTone === "error") {
                setStatus("");
                setStatusTone("muted");
              }
            }}
            placeholder="6文字以上で入力してください"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
            required
            disabled={loading}
          />
          <p className="helper-text weak">数字と英字を混ぜるとより安全です。</p>
        </div>

        <div className="auth-actions">
          <div className="auth-hint">
            <i className="fas fa-info-circle" aria-hidden="true" />
            <span>入力内容はSupabaseで暗号化して管理します。</span>
          </div>
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? "送信中..." : content.buttonLabel}
          </button>
        </div>

        <p className={`auth-status ${statusClass}`} aria-live="polite">
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
