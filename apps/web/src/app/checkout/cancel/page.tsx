import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "決済を中断しました | 相模建設ツクルンジャー AI診断",
  description:
    "Stripeの決済を完了できませんでした。プランを選び直して再度お試しください。完了するとサーバーに状態を保存します。",
};

export default function CheckoutCancelPage() {
  return (
    <div className="plan-page">
      <header className="plan-hero">
        <div className="container">
          <p className="plan-eyebrow">決済未完了</p>
          <h1 className="plan-hero-title">決済が完了していません</h1>
          <p className="plan-hero-lead">
            Stripe上で手続きが完了しませんでした。カード情報を再入力する場合はプランを選び直して「決済へ進む」を押してください。完了すると状態が保存され、診断に戻れます。
          </p>
          <div className="plan-hero-actions">
            <span className="plan-hero-note">決済が終わらなければ利用状態は変わりません。再度お試しください。</span>
            <div className="plan-hero-buttons">
              <Link href="/checkout/plan" className="btn btn-primary">
                プランを選び直す
              </Link>
              <Link href="/workspace" className="btn btn-secondary">
                診断ページへ戻る
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="plan-main">
        <div className="container">
          <div className="plan-summary">
            <div>
              <p className="plan-summary-label">再開の方法</p>
              <p className="plan-summary-main">もう一度プランを選んで決済を開始してください</p>
              <p className="plan-summary-note">
                決済完了後に状態を保存します。まずはStripeでの手続きを完了させてください。
              </p>
            </div>
            <div className="plan-summary-actions">
              <Link href="/checkout/plan" className="btn btn-primary">
                プランに戻る
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
