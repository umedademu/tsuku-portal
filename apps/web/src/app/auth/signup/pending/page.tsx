import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "メール確認 | 相模建設ツクルンジャー AI診断",
  description: "登録したメールアドレス宛に認証リンクを送信しました。",
};

type SignupPendingPageProps = {
  searchParams?: {
    email?: string | string[];
  };
};

export default function SignupPendingPage({ searchParams }: SignupPendingPageProps) {
  const rawEmail = searchParams?.email;
  const email =
    typeof rawEmail === "string"
      ? rawEmail
      : Array.isArray(rawEmail)
        ? rawEmail[0]
        : "";

  return (
    <div className="auth-card">
      <div className="auth-card-head">
        <p className="auth-eyebrow">仮登録が完了しました</p>
        <h1 className="auth-title">メールをご確認ください</h1>
        <p className="auth-desc">
          登録したメールアドレス宛に本登録用の案内を送信しています。メール内のリンクを開くと登録が完了します。
        </p>
      </div>

      <div className="auth-state-banner">
        <div className="auth-state-texts">
          <p className="auth-state-label">送信先</p>
          <p className="auth-state-main">
            {email
              ? `登録したメールアドレス「${email}」宛に認証リンクを届けました。`
              : "入力いただいたメールアドレス宛に認証リンクを届けました。"}
          </p>
          <p className="auth-state-note">
            数分経ってもメールが届かない場合は迷惑メールをご確認ください。それでも見つからないときは、再度登録し直すか別のメールアドレスをご利用ください。
          </p>
        </div>
      </div>

      <div className="auth-status muted">
        <ul className="helper-text">
          <li>届いたメール内のリンクを開くと本登録が完了し、自動で診断ページに移動します。</li>
          <li>リンクの有効期限が切れていた場合は、もう一度登録を行ってください。</li>
        </ul>
      </div>

      <div className="auth-actions">
        <div className="auth-hint">
          <i className="fas fa-envelope-open-text" aria-hidden="true" />
          <span>メールを開いて本登録を済ませてください。</span>
        </div>
        <Link href="/" className="btn btn-secondary auth-submit">
          トップに戻る
        </Link>
      </div>
    </div>
  );
}
