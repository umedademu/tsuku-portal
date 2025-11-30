import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プラン変更が完了しました | 相模建設ツクルンジャー AI診断",
  description:
    "プラン変更が完了しました。日割りで精算し、現在の更新日は据え置きです。診断ページへ戻る導線を用意しています。",
};

export default function PlanChangeSuccessPage() {
  return (
    <div className="plan-page">
      <header className="plan-hero">
        <div className="container">
          <p className="plan-eyebrow">プラン変更</p>
          <h1 className="plan-hero-title">プランの変更が完了しました</h1>
          <p className="plan-hero-lead">
            変更内容は即時反映され、更新日はそのままです。差額はStripeで日割り精算し、下位プランは次回請求で相殺します。
          </p>
          <div className="plan-hero-actions">
            <span className="plan-hero-note">
              サブスク状態や更新日は診断ページ上部に表示されます。反映されない場合は再読み込みしてください。
            </span>
            <div className="plan-hero-buttons">
              <Link href="/workspace" className="btn btn-primary">
                診断ページへ戻る
              </Link>
              <Link href="/checkout/plan" className="btn btn-secondary">
                別のプランを検討
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="plan-main">
        <div className="container">
          <div className="plan-summary">
            <div>
              <p className="plan-summary-label">反映タイミング</p>
              <p className="plan-summary-main">すぐに有効</p>
              <p className="plan-summary-note">
                更新日は据え置きで、日割り精算だけ実施します。停止予約がある場合はサブスク状態の表示を確認してください。
              </p>
            </div>
            <div className="plan-summary-actions">
              <Link href="/workspace" className="btn btn-primary">
                診断を続ける
              </Link>
              <Link href="/" className="btn btn-secondary">
                トップに戻る
              </Link>
            </div>
          </div>

          <div className="plan-grid">
            <article className="plan-card green active">
              <div className="plan-card-top">
                <span className="plan-badge">サブスク状態</span>
                <h2 className="plan-name">最新の状態を診断ページで確認</h2>
                <p className="plan-tagline">上部のタグとサブスク状態欄に反映されています。</p>
              </div>

              <p className="plan-highlight">
                変更後のプランと更新日は診断ページのヘッダーに表示されます。表示が変わらない場合は再読み込みしてください。
              </p>

              <ul className="plan-feature-list">
                <li className="plan-feature">
                  <span className="plan-check" aria-hidden="true">
                    ✓
                  </span>
                  <span>更新日は据え置きのまま</span>
                </li>
                <li className="plan-feature">
                  <span className="plan-check" aria-hidden="true">
                    ✓
                  </span>
                  <span>アップグレードは即時課金で反映</span>
                </li>
                <li className="plan-feature">
                  <span className="plan-check" aria-hidden="true">
                    ✓
                  </span>
                  <span>ダウングレードは次回請求で差額を相殺</span>
                </li>
              </ul>

              <div className="plan-card-bottom">
                <p className="plan-note">
                  差額や停止予約の状況はサブスク状態の表示で確認できます。疑問があればサポートへお知らせください。
                </p>
              </div>
            </article>

            <article className="plan-card blue">
              <div className="plan-card-top">
                <span className="plan-badge">次の操作</span>
                <h2 className="plan-name">再変更や別プランの検討も可能</h2>
                <p className="plan-tagline">必要に応じていつでもプランを切り替えられます。</p>
              </div>

              <p className="plan-highlight">
                更新日は据え置きのまま、差額は自動で日割り計算されます。再度変更する場合はプラン選択ページをご利用ください。
              </p>

              <div className="plan-card-bottom">
                <div className="plan-card-actions">
                  <Link href="/checkout/plan" className="btn btn-primary">
                    プランを見直す
                  </Link>
                  <Link href="/workspace" className="btn btn-secondary">
                    診断ページへ戻る
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      </main>
    </div>
  );
}
