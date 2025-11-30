"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { supabaseBrowserClient } from "@/lib/supabase-client";

type CallbackTone = "info" | "error" | "success";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("確認中です。しばらくお待ちください。");
  const [tone, setTone] = useState<CallbackTone>("info");

  useEffect(() => {
    let cancelled = false;

    const queryCode = searchParams.get("code");
    const queryToken = searchParams.get("token");

    let code = queryCode || queryToken || "";

    // ハッシュ側にトークンが入るケースを考慮
    let hashAccessToken = "";
    let hashRefreshToken = "";
    if (typeof window !== "undefined") {
      const hashParams = new URLSearchParams(window.location.hash.replace("#", ""));
      hashAccessToken = hashParams.get("access_token") || "";
      hashRefreshToken = hashParams.get("refresh_token") || "";
      if (!code) {
        code = hashParams.get("code") || hashParams.get("token") || "";
      }
    }

    const run = async () => {
      try {
        // SupabaseがURLを処理した後にセッションだけ残るケースを先に拾う
        const { data: existingSession, error: sessionError } =
          await supabaseBrowserClient.auth.getSession();
        if (sessionError) {
          if (!cancelled) {
            setTone("error");
            setMessage("認証状態の確認に失敗しました。もう一度お試しください。");
          }
          return;
        }
        if (existingSession.session) {
          if (!cancelled) {
            setTone("success");
            setMessage("ログインが完了しました。診断ページへ移動します。");
            router.replace("/workspace?auth=signup_verified");
          }
          return;
        }

        if (!code && !hashAccessToken) {
          if (!cancelled) {
            setTone("error");
            setMessage("認証コードが見つかりませんでした。メールのリンクをもう一度開いてください。");
          }
          return;
        }

        // ハッシュにaccess/refresh tokenがある場合は直接セッション化
        if (hashAccessToken && hashRefreshToken) {
          const { error: setSessionError } = await supabaseBrowserClient.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });
          if (setSessionError) {
            throw setSessionError;
          }
          if (!cancelled) {
            setTone("success");
            setMessage("ログインが完了しました。診断ページへ移動します。");
            router.replace("/workspace?auth=signup_verified");
          }
          return;
        }

        // セッションが無い場合のみコード交換を試す
        if (code) {
          const { error: exchangeError } =
            await supabaseBrowserClient.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }

          if (!cancelled) {
            setTone("success");
            setMessage("ログインが完了しました。診断ページへ移動します。");
            router.replace("/workspace?auth=signup_verified");
          }
          return;
        }
      } catch {
        if (!cancelled) {
          setTone("error");
          setMessage("認証に失敗しました。リンクの有効期限を確認して、必要なら再度ログインしてください。");
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="auth-card">
      <div className="auth-card-head">
        <p className="auth-eyebrow">メール認証</p>
        <h1 className="auth-title">ログイン処理中</h1>
        <p className="auth-desc">確認メールのリンクを検証しています。</p>
      </div>

      <div
        className={`auth-status ${tone === "error" ? "error" : tone === "success" ? "success" : ""}`}
        aria-live="polite"
      >
        {message}
      </div>

      <div className="auth-actions">
        <div className="auth-hint">
          <i className="fas fa-arrow-left" aria-hidden="true" />
          <span>画面が切り替わらない場合は下のボタンから戻れます。</span>
        </div>
        <Link href="/workspace" className="btn btn-secondary auth-submit">
          診断ページへ進む
        </Link>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-card">
          <div className="auth-card-head">
            <p className="auth-eyebrow">メール認証</p>
            <h1 className="auth-title">ログイン処理中</h1>
            <p className="auth-desc">確認メールのリンクを検証しています。</p>
          </div>
          <div className="auth-status">確認中です。しばらくお待ちください。</div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
