import Link from "next/link";
import type { ReactNode } from "react";

const companyLabel = "株式会社 相模建設ツクルンジャー";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page-wrapper auth-page">
      <header className="auth-header">
        <div className="container auth-header-inner">
          <Link href="/" className="auth-brand">
            <span className="auth-brand-icon">
              <i className="fas fa-helmet-safety" aria-hidden="true" />
            </span>
            <div className="auth-brand-text">
              <span className="auth-brand-name">{companyLabel}</span>
              <span className="auth-brand-sub">AIセカンドオピニオン</span>
            </div>
          </Link>
          <Link href="/" className="auth-back-link">
            <i className="fas fa-arrow-left" aria-hidden="true" />
            <span>トップへ戻る</span>
          </Link>
        </div>
      </header>
      <main className="auth-main">
        <div className="auth-shell">{children}</div>
      </main>
    </div>
  );
}
