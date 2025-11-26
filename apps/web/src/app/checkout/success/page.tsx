import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "決済完了 | 相模建設ツクルンジャー AI診断",
  description: "Stripeでの決済が完了しました。利用状態への反映は次のステップで接続します。",
};

export default function CheckoutSuccessPage() {
  return (
    <div className="plan-page">
      <header className="plan-hero">
        <div className="container">
          <p className="plan-eyebrow">決済完了</p>
          <h1 className="plan-hero-title">Stripeでの決済が完了しました</h1>
          <p className="plan-hero-lead">
            お支払いありがとうございます。利用状態の更新や残数の反映は次のステップで接続します。
            いまはこの確認画面のみ用意しています。
          </p>
          <div className="plan-hero-actions">
            <span className="plan-hero-note">診断ページにはそのまま戻れます。状態反映はまだ行われません。</span>
            <div className="plan-hero-buttons">
              <Link href="/workspace" className="btn btn-primary">
                診断ページへ進む
              </Link>
              <Link href="/checkout/plan" className="btn btn-secondary">
                プランを見直す
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="plan-main">
        <div className="container">
          <div className="plan-summary">
            <div>
              <p className="plan-summary-label">次の工程</p>
              <p className="plan-summary-main">アプリ側への反映はこれから行います</p>
              <p className="plan-summary-note">
                Stripe上では決済が完了しています。ユーザーのプラン状態や残数更新は次のステップでWebhookとDBをつないで反映します。
              </p>
            </div>
            <div className="plan-summary-actions">
              <Link href="/workspace" className="btn btn-primary">
                診断を続ける
              </Link>
              <Link href="/" className="btn btn-secondary">
                トップへ戻る
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
