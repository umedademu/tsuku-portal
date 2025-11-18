import Image from "next/image";
import { Fragment } from "react";

const companyName = "株式会社相模建設ツクルンジャー";
const navLinks = [
  { label: "選ばれる理由", href: "#why-ai" },
  { label: "施工事例", href: "#works" },
  { label: "専門家紹介", href: "#expert-profile" },
];
const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/kensetusentai/",
    icon: "fab fa-instagram",
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@tsukurunja",
    icon: "fab fa-tiktok",
  },
  {
    label: "LINE",
    href: "https://line.me/ti/p/~kensetusentai88612",
    icon: "fab fa-line",
  },
];
const stats = { remainingToday: 5, monthlyUsers: 128 };
const features = [
  {
    icon: "🔍",
    title: "不透明なコスト構造の\n可視化",
    description:
      "見積書の各項目を詳細分析し、適正価格との比較や不明瞭な費用を特定します。チャットで疑問点を深掘りできます。",
  },
  {
    icon: "🛡️",
    title: "見えないリスクの可視化",
    description:
      "構造計算書や図面から潜在的な安全性リスクを発見し、将来的なトラブルを未然に防ぐための提案を行います。",
  },
  {
    icon: "⚡",
    title: "即座に専門知識を活用",
    description:
      "通常なら複数の専門家に相談が必要な内容をAIが総合判断。相談にかかる時間と費用を大幅に削減できます。",
  },
];
const caseStudies = [
  {
    region: "神奈川県横浜市",
    date: "2024年9月",
    title: "RC造商業施設の耐震補強で1,200万円削減",
    summary:
      "既存の補強案に潜む過剰仕様を洗い出し、必要強度を維持しながら部材と工程を最適化。意思決定前に安全性とコストのバランスを可視化しました。",
    result: "削減率18%",
  },
  {
    region: "東京都町田市",
    date: "2024年7月",
    title: "木造二世帯住宅の断熱グレード見直し",
    summary:
      "将来メンテ費の観点から断熱仕様を比較し、快適性を損なわずに電気代と初期費用を同時に抑える仕様へ変更。家族の不安を先回りして解消しました。",
    result: "電気代予測▲23%",
  },
  {
    region: "神奈川県相模原市",
    date: "2024年6月",
    title: "物流倉庫の床荷重リスクを可視化",
    summary:
      "荷重計算の抜け漏れをAIが指摘し、荷物動線と補強ポイントを明確化。施工後の事故リスクを避けながら、計画段階で最適な補強案を提示しました。",
    result: "是正費0円で回避",
  },
];
const regionKeywords = [
  "横浜市の大規模改修",
  "川崎市のマンション修繕",
  "相模原市の戸建て相談",
  "厚木市の工場リニューアル",
  "海老名市のマンション外壁",
  "平塚市の耐震補強",
  "町田市の土地活用",
  "湘南エリアのリゾート建築",
];
const sitemapLinks = [
  { label: "HOME", href: "#hero-cta-anchor" },
  { label: "選ばれる理由", href: "#why-ai" },
  { label: "施工事例", href: "#works" },
  { label: "専門家紹介", href: "#expert-profile" },
];
const office = {
  address: "〒252-0000 神奈川県相模原市中央区中央1-2-3",
  tel: "TEL: 042-000-0000",
};

const formatLineBreaks = (text: string) => {
  const parts = text.split("\n");
  return parts.map((part, index) => (
    <Fragment key={`${part}-${index}`}>
      {part}
      {index < parts.length - 1 && <br />}
    </Fragment>
  ));
};

export default function Home() {
  return (
    <div className="page-wrapper">
      <header className="site-header">
        <div className="container">
          <div className="inner">
            <div className="social-links header-social-links">
              {socialLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={link.label}
                >
                  <i className={link.icon} aria-hidden="true" />
                </a>
              ))}
            </div>
            <div className="nav-area">
              <ul className="nav-menu">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
                <li>
                  <a className="btn btn-primary" href="#hero-cta-anchor">
                    無料診断開始
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div id="hero-cta-anchor" />
        <section className="hero section">
          <div className="container">
            <div className="hero-content">
              <div className="system-badge">
                <i className="fas fa-brain" aria-hidden="true" />
                <span>Google最新AI「Gemini 2.5 Pro」搭載診断システム</span>
              </div>
              <h1>
                その見積もり内容、
                <span className="highlight">本当に適正ですか？</span>
              </h1>
              <p>
                契約を決める前に。当社のAIが、お手元の見積もりや図面に潜む
                <br />
                「コストと安全性のリスク」を無料で<strong>診断・明確化</strong>
                します。
              </p>
              <div className="action-buttons">
                <button
                  type="button"
                  className="btn btn-primary specialist-btn"
                  data-funnel="B2B"
                  data-mode="B2B_アナリスト"
                  id="cta-b2b"
                >
                  <i className="fas fa-building" aria-hidden="true" />
                  <span>事業者向け：リスク診断を開始</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary specialist-btn"
                  data-funnel="B2C"
                  data-mode="ゴールド"
                  id="cta-b2c"
                >
                  <i className="fas fa-home" aria-hidden="true" />
                  <span>個人向け：安心診断を開始</span>
                </button>
              </div>
              <div className="urgency-bar">
                本日の無料診断受付 残り：
                <span className="highlight">{stats.remainingToday}</span>
                名
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="why-ai">
          <div className="container">
            <h2 className="section-title">セカンドオピニオンの重要性</h2>
            <p className="section-subtitle">
              建設業界の隠れた問題を、最新AI技術で解決します。
              <br />
              今月、
              <span className="highlight">{stats.monthlyUsers}</span>
              名がこの診断を利用しました。
            </p>
            <div className="features-grid">
              {features.map((feature) => (
                <div className="feature-card" key={feature.title}>
                  <div className="feature-icon" aria-hidden="true">
                    {feature.icon}
                  </div>
                  <h3>{formatLineBreaks(feature.title)}</h3>
                  <p>{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section expert-section" id="expert-profile">
          <div className="container">
            <h2 className="section-title">監修・運営責任者</h2>
              <div className="expert-profile">
              <div className="expert-image">
                <Image
                  src="https://via.placeholder.com/220x240.png?text=Profile"
                  alt="代表取締役の写真"
                  width={220}
                  height={240}
                  className="profile-photo"
                />
              </div>
              <div className="expert-bio">
                <h3>代表取締役 〇〇 〇〇</h3>
                <p className="expert-title">{companyName}</p>
                <p>
                  建設業界での17年以上の経験に基づき、お客様が直面する不安や疑問を解消するために、このAI診断システムを開発しました。私たちは、透明性の高い情報提供と、お客様の資産を守ることを最優先に考えています。AIによる客観的な分析と、我々の専門知識を組み合わせることで、皆様のプロジェクトを成功に導きます。
                </p>
                <p className="expert-credentials">
                  保有資格：一級土木施工管理士
                  <br />
                  建設業許可：神奈川県知事許可（般-X）第XXXXX号
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section works-section" id="works">
          <div className="container">
            <h2 className="section-title">信頼の証：最新の施工事例</h2>
            <div className="works-grid">
              {caseStudies.map((study) => (
                <article className="work-card" key={study.title}>
                  <p className="work-meta">
                    {study.date} | {study.region}
                  </p>
                  <h3>{study.title}</h3>
                  <p>{study.summary}</p>
                  <span>{study.result}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section seo-links-section">
          <div className="container">
            <h3 className="section-title">地域別サービス案内</h3>
            <div className="keyword-cloud">
              {regionKeywords.map((keyword) => (
                <span className="keyword-pill" key={keyword}>
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-section">
              <h4>{companyName}</h4>
              <p>{office.address}</p>
              <p>{office.tel}</p>
              <div className="social-links" style={{ marginTop: "12px" }}>
                {socialLinks.map((link) => (
                  <a
                    key={`${link.href}-footer`}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={link.label}
                  >
                    <i className={link.icon} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
            <div className="footer-section">
              <h4>サイトマップ</h4>
              <ul>
                {sitemapLinks.map((link) => (
                  <li key={`${link.href}-footer`}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="footer-section">
              <h4>関連情報</h4>
              <ul>
                <li>プライバシーポリシー</li>
                <li>XMLサイトマップ</li>
              </ul>
            </div>
          </div>
          <p className="footer-note">© {new Date().getFullYear()} {companyName}</p>
        </div>
      </footer>
    </div>
  );
}
