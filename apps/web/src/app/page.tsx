'use client';

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  Suspense,
} from "react";

const companyName = "株式会社 相模建設ツクルンジャー";
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
const features = [
  {
    icon: "🔍",
    title: "不透明なコスト構造の\n可視化",
    description:
      "見積書の内訳を詳細に分析し、妥当価格との比較で不明瞭な費用を特定します。チャットで疑問点を深掘りできます。",
  },
  {
    icon: "🛡️",
    title: "見えないリスクの可視化",
    description:
      "構造計算書や図面から潜在的な安全性リスクを発見し、想定外のトラブルを未然に防ぐための提案を行います。",
  },
  {
    icon: "⚡",
    title: "即座に専門知識を活用",
    description:
      "通常なら複数の専門家に相談が必要な領域をAIが総合判断。相談にかかる時間と費用を大幅に削減できます。",
  },
];
const caseStudies = [
  {
    label: "神奈川県横浜市戸塚区 階段左官工事",
    imageSrc: "/images/sekou-jirei/jirei-27.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-27.jpg",
  },
  {
    label: "神奈川県大和市中央林間 カーポート設置、舗装工事",
    imageSrc: "/images/sekou-jirei/jirei-08.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-08.jpg",
  },
  {
    label: "横浜市 施設敷地内点字シート設置工事",
    imageSrc: "/images/sekou-jirei/jirei-10.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-10.jpg",
  },
  {
    label: "神奈川県藤沢市鵠沼海岸 浸透槽設置工事",
    imageSrc: "/images/sekou-jirei/jirei-01.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-01.jpg",
  },
  {
    label: "横浜市 石積み擁壁補強工事",
    imageSrc: "/images/sekou-jirei/jirei-03.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-03.jpg",
  },
  {
    label: "神奈川県横浜市鶴見区駒岡 私道舗装工事",
    imageSrc: "/images/sekou-jirei/jirei-05.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-05.jpg",
  },
  {
    label: "東京都 山留め工事",
    imageSrc: "/images/sekou-jirei/jirei-07.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-07.jpg",
  },
  {
    label: "神奈川県相模原市南区相模大野 鉄筋工事",
    imageSrc: "/images/sekou-jirei/jirei-12.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-12.jpg",
  },
  {
    label: "神奈川県座間市 左官工事",
    imageSrc: "/images/sekou-jirei/jirei-14.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-14.jpg",
  },
  {
    label: "厚木市 屋上舗装表面補修工事",
    imageSrc: "/images/sekou-jirei/jirei-17.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-17.jpg",
  },
  {
    label: "東京都日野市 敷地内車止め設置工事",
    imageSrc: "/images/sekou-jirei/jirei-18.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-18.jpg",
  },
  {
    label: "東京都荒川区 敷地内段差解消スロープ設置工事",
    imageSrc: "/images/sekou-jirei/jirei-20.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-20.jpg",
  },
  {
    label: "神奈川県相模原市緑区 法面保護工事",
    imageSrc: "/images/sekou-jirei/jirei-21.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-21.jpg",
  },
  {
    label: "神奈川県相模原市緑区 土止め擁壁工事",
    imageSrc: "/images/sekou-jirei/jirei-23.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-23.jpg",
  },
  {
    label: "神奈川県横浜市都筑区 歩車道ブロック据え付け工事",
    imageSrc: "/images/sekou-jirei/jirei-28.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-28.jpg",
  },
  {
    label: "川崎市麻生区百合ヶ丘 造成工事",
    imageSrc: "/images/sekou-jirei/jirei-32.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-32.jpg",
  },
  {
    label: "神奈川県相模原市緑区 敷地内芝張り工事",
    imageSrc: "/images/sekou-jirei/jirei-36.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-36.jpg",
  },
  {
    label: "神奈川県大和市中央林間 造成工事一式",
    imageSrc: "/images/sekou-jirei/jirei-41.jpg",
    thumbSrc: "/images/sekou-jirei/thumb/thumb-jirei-41.jpg",
  },
];
const sitemapLinks = [
  { label: "HOME", href: "#hero-cta-anchor" },
  { label: "選ばれる理由", href: "#why-ai" },
  { label: "施工事例", href: "#works" },
  { label: "専門家紹介", href: "#expert-profile" },
];
const footerHashtags = ["神奈川県", "東京都", "外構造成工事", "リフォーム", "自費工事"];
const office = {
  address: "〒252-0237\n神奈川県相模原市\n中央区千代田1-3-13-2",
  contacts: [
    {
      items: ["メール: info@tukurunja.jp", "社長直通: 050-8883-9720"],
      note: "（365日24時間 受付）",
    },
    {
      items: ["会社代表: 042-704-9413"],
      note: "（平日 9:00〜16:30 受付）",
    },
  ],
};

const characters = {
  char1: { src: "/images/characters/char_1.png", alt: "キャラクター1" },
  char2: { src: "/images/characters/char_2.png", alt: "キャラクター2" },
  char3: { src: "/images/characters/char_3.png", alt: "キャラクター3" },
  char4: { src: "/images/characters/char_4.png", alt: "キャラクター4" },
  char5: { src: "/images/characters/char_5.png", alt: "キャラクター5" },
  char6: { src: "/images/characters/char_6.png", alt: "キャラクター6" },
  char7: { src: "/images/characters/char_7.png", alt: "キャラクター7" },
  char8: { src: "/images/characters/char_8.png", alt: "キャラクター8" },
  char9: { src: "/images/characters/char_9.png", alt: "キャラクター9" },
  char10: { src: "/images/characters/char_10.png", alt: "キャラクター10" },
} as const;

type CharacterId = keyof typeof characters;

const CharacterSticker = ({
  id,
  className = "",
  width,
  height,
  priority = false,
  sizes,
}: {
  id: CharacterId;
  className?: string;
  width: number;
  height: number;
  priority?: boolean;
  sizes?: string;
}) => {
  const character = characters[id];
  return (
    <div className={`character-sticker ${className}`.trim()}>
      <Image
        src={character.src}
        alt={character.alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
      />
    </div>
  );
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

function AuthNoticeLoader({
  onNotice,
}: {
  onNotice: (notice: { text: string; tone: "success" | "info" | "error" } | null) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth");
  const searchParamsString = searchParams.toString();

  useEffect(() => {
    if (!authParam) return;

    const noticeMap: Record<
      string,
      { text: string; tone: "success" | "info" | "error" }
    > = {
      login_success: {
        text: "ログインしました。診断を再開できます。",
        tone: "success",
      },
      signup_success: {
        text: "登録が完了しました。診断を始められます。",
        tone: "success",
      },
      signup_pending: {
        text: "仮登録が完了しました。メールのリンクで本登録を完了してください。",
        tone: "info",
      },
      signup_verified: {
        text: "メール認証が完了しました。ログイン状態になりました。",
        tone: "success",
      },
    };

    const found = noticeMap[authParam];
    if (!found) return;

    onNotice(found);
    const params = new URLSearchParams(searchParamsString);
    params.delete("auth");
    const nextPath = params.toString() ? `/?${params.toString()}` : "/";
    router.replace(nextPath, { scroll: false });
  }, [authParam, onNotice, router, searchParamsString]);

  return null;
}

export default function Home() {
  const [authNotice, setAuthNotice] = useState<{
    text: string;
    tone: "success" | "info" | "error";
  } | null>(null);
  const [workLightboxIndex, setWorkLightboxIndex] = useState<number | null>(null);
  const worksScrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollWorksPrev, setCanScrollWorksPrev] = useState(false);
  const [canScrollWorksNext, setCanScrollWorksNext] = useState(false);
  const totalWorks = caseStudies.length;

  const updateWorksScrollState = useCallback(() => {
    const scroller = worksScrollerRef.current;
    if (!scroller) return;

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    const currentScrollLeft = scroller.scrollLeft;
    setCanScrollWorksPrev(currentScrollLeft > 0);
    setCanScrollWorksNext(currentScrollLeft < maxScrollLeft - 1);
  }, []);

  const scrollWorksByPage = useCallback((direction: "prev" | "next") => {
    const scroller = worksScrollerRef.current;
    if (!scroller) return;

    const firstItem = scroller.querySelector<HTMLElement>(".work-item");
    const gapValue = Number.parseFloat(
      window.getComputedStyle(scroller).columnGap || window.getComputedStyle(scroller).gap || "0",
    );
    const amount = firstItem
      ? firstItem.getBoundingClientRect().width + (Number.isFinite(gapValue) ? gapValue : 0)
      : scroller.clientWidth;
    scroller.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    if (!authNotice) return;
    const timer = setTimeout(() => setAuthNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [authNotice]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(updateWorksScrollState);
    window.addEventListener("resize", updateWorksScrollState);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateWorksScrollState);
    };
  }, [updateWorksScrollState]);

  useEffect(() => {
    if (workLightboxIndex === null) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [workLightboxIndex]);

  useEffect(() => {
    if (workLightboxIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setWorkLightboxIndex(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setWorkLightboxIndex((current) => {
          if (current === null) return current;
          return (current - 1 + totalWorks) % totalWorks;
        });
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setWorkLightboxIndex((current) => {
          if (current === null) return current;
          return (current + 1) % totalWorks;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalWorks, workLightboxIndex]);

  return (
    <div className="page-wrapper">
      <header className="site-header">
        <div className="container">
          <div className="inner">
            <div className="header-social">
              <div className="social-links">
                {socialLinks.map((link) => (
                  <a
                    key={`${link.href}-header`}
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
            <div className="nav-area">
              <ul className="nav-menu">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <Suspense fallback={null}>
          <AuthNoticeLoader onNotice={setAuthNotice} />
        </Suspense>
        {authNotice && (
          <div className="container">
            <div className={`auth-notice ${authNotice.tone}`}>
              <div className="auth-notice-text">
                <i
                  className={
                    authNotice.tone === "success"
                      ? "fas fa-check-circle"
                      : authNotice.tone === "error"
                        ? "fas fa-exclamation-circle"
                        : "fas fa-info-circle"
                  }
                  aria-hidden="true"
                />
                <span>{authNotice.text}</span>
              </div>
              <button
                type="button"
                className="auth-notice-close"
                onClick={() => setAuthNotice(null)}
                aria-label="通知を閉じる"
              >
                ×
              </button>
            </div>
          </div>
        )}
        <div id="hero-cta-anchor" />
        <section className="hero section">
          <div className="character-layer hero-characters" aria-hidden="true">
            <CharacterSticker
              id="char1"
              className="hero-char hero-char-1"
              width={220}
              height={220}
              priority
              sizes="(max-width: 768px) 140px, 220px"
            />
            <CharacterSticker
              id="char2"
              className="hero-char hero-char-2"
              width={240}
              height={240}
              priority
              sizes="(max-width: 768px) 160px, 240px"
            />
            <CharacterSticker
              id="char3"
              className="hero-char hero-char-3"
              width={200}
              height={200}
              priority
              sizes="(max-width: 768px) 150px, 200px"
            />
            <CharacterSticker
              id="char4"
              className="hero-char hero-char-4"
              width={190}
              height={190}
              sizes="(max-width: 768px) 150px, 190px"
            />
          </div>
          <div className="container animate-slide-up">
            <div className="hero-content">
              <div className="system-badge">
                <i className="fas fa-brain" aria-hidden="true" />
                <span>Google最新AI「Gemini 2.5 Pro」搭載診断システム</span>
              </div>
              <h1>
                その見積もり内容、
                <br />
                <span className="highlight">本当に適正ですか？</span>
              </h1>
              <p>
                契約を決める前に。当社のAIが、お手元の見積もりや図面に潜む
                <br />
                「コストと安全性のリスク」を無料で<strong>診断・明確化</strong>
                します。
              </p>
              <div className="auth-buttons delay-200 animate-slide-up">
                <Link href="/auth/signup" className="btn btn-primary auth-button auth-button-primary">
                  無料診断を今すぐ始める
                </Link>
                <Link href="/auth/login" className="btn btn-secondary auth-button auth-button-secondary">
                  ログイン
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="why-ai">
          <div className="character-layer feature-characters" aria-hidden="true">
          </div>
          <div className="container">
            <h2 className="section-title text-center">セカンドオピニオンの重要性</h2>
            <p className="section-subtitle text-center">
              建設業界で見落とされがちな問題を、最新AI技術で解決します。
            </p>
            <div className="features-grid">
              {features.map((feature, idx) => (
                <div className={`feature-card animate-slide-up delay-${(idx + 1) * 100}`} key={feature.title}>
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
          <div className="character-layer expert-characters" aria-hidden="true">
            <CharacterSticker
              id="char5"
              className="expert-char expert-char-1"
              width={170}
              height={170}
              sizes="(max-width: 768px) 120px, 170px"
            />
            <CharacterSticker
              id="char6"
              className="expert-char expert-char-2"
              width={210}
              height={210}
              sizes="(max-width: 768px) 140px, 210px"
            />
          </div>
          <div className="container">
            <h2 className="section-title text-center">専門家紹介</h2>
            <div className="expert-profile animate-slide-up">
              <div className="expert-image">
                <Image
                  src="/profile.png"
                  alt="専門家の写真"
                  width={240}
                  height={240}
                  className="profile-photo"
                />
              </div>
              <div className="expert-bio">
                <h3>秋元 航</h3>
                <p className="expert-title">{companyName}</p>
                <p>
                  現場経験とAI活用の両軸で、コストとリスクを同時に最適化する診断が得意です。
                  公共案件から住宅リフォームまで対応します。
                </p>
                <p className="expert-credentials">
                  保有資格: 一級土木施工管理技士 / 一級管工事施工管理技士
                  <br />
                  実績: 戸建て・マンション改修、RC構造、公共案件 など
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section works-section" id="works">
          <div className="character-layer works-characters" aria-hidden="true">
            <CharacterSticker
              id="char7"
              className="works-char works-char-1"
              width={190}
              height={190}
              sizes="(max-width: 768px) 130px, 190px"
            />
            <CharacterSticker
              id="char8"
              className="works-char works-char-2"
              width={200}
              height={200}
              sizes="(max-width: 768px) 140px, 200px"
            />
          </div>
          <div className="container">
            <h2 className="section-title text-center">施工事例</h2>
            <div className="works-grid">
              <div className="work-card animate-slide-up">
                <div className="work-carousel">
                  <button
                    type="button"
                    className="work-carousel-nav"
                    onClick={() => scrollWorksByPage("prev")}
                    aria-label="左へ"
                    disabled={!canScrollWorksPrev}
                  >
                    {"<"}
                  </button>

                  <div
                    className="work-items-grid"
                    ref={worksScrollerRef}
                    onScroll={updateWorksScrollState}
                  >
                    {caseStudies.map((study, idx) => (
                      <button
                        type="button"
                        className="work-item"
                        key={study.imageSrc}
                        onClick={() => setWorkLightboxIndex(idx)}
                        aria-label={`${study.label}を拡大して表示`}
                      >
                        <div className="work-thumbnail">
                          <Image
                            src={study.thumbSrc}
                            alt={study.label}
                            fill
                            sizes="(max-width: 768px) 100vw, 420px"
                          />
                        </div>
                        <p className="work-label">{study.label}</p>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="work-carousel-nav"
                    onClick={() => scrollWorksByPage("next")}
                    aria-label="右へ"
                    disabled={!canScrollWorksNext}
                  >
                    {">"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {workLightboxIndex !== null && (
            <div
              className="work-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label="施工事例の拡大表示"
              onClick={() => setWorkLightboxIndex(null)}
            >
              <div
                className="work-lightbox-panel"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="work-lightbox-close"
                  onClick={() => setWorkLightboxIndex(null)}
                  aria-label="閉じる"
                >
                  ×
                </button>

                <button
                  type="button"
                  className="work-lightbox-nav work-lightbox-prev"
                  onClick={() =>
                    setWorkLightboxIndex(
                      (current) =>
                        current === null
                          ? current
                          : (current - 1 + totalWorks) % totalWorks,
                    )
                  }
                  aria-label="前の写真へ"
                >
                  {"<"}
                </button>

                <button
                  type="button"
                  className="work-lightbox-nav work-lightbox-next"
                  onClick={() =>
                    setWorkLightboxIndex(
                      (current) =>
                        current === null ? current : (current + 1) % totalWorks,
                    )
                  }
                  aria-label="次の写真へ"
                >
                  {">"}
                </button>

                <div className="work-lightbox-image">
                  <Image
                    src={caseStudies[workLightboxIndex].imageSrc}
                    alt={caseStudies[workLightboxIndex].label}
                    fill
                    sizes="(max-width: 768px) 92vw, 1100px"
                    priority
                  />
                </div>

                <div className="work-lightbox-footer">
                  <p className="work-lightbox-caption">
                    {caseStudies[workLightboxIndex].label}
                  </p>
                  <p className="work-lightbox-counter">
                    {workLightboxIndex + 1} / {totalWorks}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="section" aria-label="関連キーワード" style={{ padding: "40px 0 80px" }}>
          <div className="container">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                justifyContent: "center",
              }}
            >
              {footerHashtags.map((keyword) => (
                <span className="keyword-pill" key={keyword}>
                  #{keyword}
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
              <p>{formatLineBreaks(office.address)}</p>
              <div className="footer-contacts">
                {office.contacts.map((contact, index) => (
                  <div className="footer-contact-group" key={index}>
                    {contact.items.map((item) => (
                      <p className="footer-contact-detail" key={item}>
                        {item}
                      </p>
                    ))}
                    <p className="footer-contact-note">{contact.note}</p>
                  </div>
                ))}
              </div>
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
              <h4>関連リンク</h4>
              <ul>
                <li><a href="#">プライバシーポリシー</a></li>
                <li><a href="#">XMLサイトマップ</a></li>
              </ul>
            </div>
          </div>
          <p className="footer-note">
            © {new Date().getFullYear()} {companyName}
          </p>
        </div>
      </footer>

    </div>
  );
}
