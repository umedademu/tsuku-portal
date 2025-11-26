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
    const queryCode = searchParams.get("code");
    const queryToken = searchParams.get("token");

    let code = queryCode || queryToken || "";

    // 一部のリンクではハッシュ側にパラメータが入るため念のため拾う
    if (!code && typeof window !== "undefined") {
      const hashParams = new URLSearchParams(window.location.hash.replace("#", ""));
      code =
        hashParams.get("code") ||
        hashParams.get("token") ||
        hashParams.get("access_token") ||
        "";
    }

    if (!code) {
      setTone("error");
      setMessage("認証コードが見つかりませんでした。メールのリンクをもう一度開いてください。");
      return;
    }

    const run = async () => {
      try {
        const { error } = await supabaseBrowserClient.auth.exchangeCodeForSession(code);
        if (error) {
          throw error;
        }
        setTone("success");
        setMessage("ログインが完了しました。トップへ移動します。");
        router.replace("/?auth=signup_verified");
      } catch {
        setTone("error");
        setMessage("認証に失敗しました。リンクの有効期限を確認して、必要なら再度ログインしてください。");
      }
    };

    void run();
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
        <Link href="/" className="btn btn-secondary auth-submit">
          トップへ戻る
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
