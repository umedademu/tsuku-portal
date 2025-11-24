'use client';

import Image from "next/image";
import {
  Fragment,
  type ReactNode,
  useEffect,
  useState,
  useRef,
  type ChangeEvent,
  type FormEvent,
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
const stats = { remainingToday: 5, monthlyUsers: 128 };
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
    region: "神奈川県横浜市",
    date: "2024年9月",
    title: "RC建築のコスト最適化とリスク低減",
    summary:
      "複数社の見積もりをAIが比較し、最適な代替案を提示。合意形成までの工数を短縮しコストを18%削減。",
    result: "コスト-18%",
  },
  {
    region: "東京都世田谷区",
    date: "2024年7月",
    title: "改修工事の安全リスク検証",
    summary:
      "現地写真と図面を突合し、潜在的な躯体リスクを洗い出し。段取りと補強案を提示し追加費用を23%抑制。",
    result: "追加費用-23%",
  },
  {
    region: "神奈川県相模原市",
    date: "2024年6月",
    title: "住宅リフォームの工程短縮",
    summary:
      "工程の依存関係と素材手配をAIが整理。調整ロスを削減し遅延ゼロで引き渡し。",
    result: "遅延ゼロ",
  },
];
const regionKeywords = [
  "戸建てリフォーム",
  "マンション改修",
  "工場・プラント",
  "公共案件",
  "造成・土木",
  "BIM/CIM",
  "コスト査定",
  "工程最適化",
];
const sitemapLinks = [
  { label: "HOME", href: "#hero-cta-anchor" },
  { label: "選ばれる理由", href: "#why-ai" },
  { label: "施工事例", href: "#works" },
  { label: "専門家紹介", href: "#expert-profile" },
];
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

type Stage = "initial" | "chat" | "inquiry";
type PlanKey = "blue" | "gold" | "green";
const planOptions: { key: PlanKey; label: string; description: string }[] = [
  {
    key: "gold",
    label: "GOLDプラン",
    description: "多次元の整合確認を重ねる精緻プラン。",
  },
  {
    key: "green",
    label: "GREENプラン",
    description: "外構・リフォーム寄りの暮らし重視プラン。",
  },
  {
    key: "blue",
    label: "BLUEプラン",
    description: "構造安全とコストの優先検討プラン。",
  },
];
const planLabelMap: Record<PlanKey, string> = {
  blue: "BLUEプラン",
  gold: "GOLDプラン",
  green: "GREENプラン",
};

type FileData = {
  name: string;
  base64: string;
  mimeType: string;
};

type GeminiPartPayload = {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
};

type GeminiHistoryPayload = {
  role: "user" | "model";
  parts: GeminiPartPayload[];
};

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const stageSteps: { key: Stage; title: string; description: string }[] = [
  {
    key: "initial",
    title: "準備",
    description: "資料の確認とプラン設定",
  },
  {
    key: "chat",
    title: "AIチャット",
    description: "要望を整理して下書き作成",
  },
  {
    key: "inquiry",
    title: "送信",
    description: "連絡先を入力して送信",
  },
];

const formatLineBreaks = (text: string) => {
  const parts = text.split("\n");
  return parts.map((part, index) => (
    <Fragment key={`${part}-${index}`}>
      {part}
      {index < parts.length - 1 && <br />}
    </Fragment>
  ));
};

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("file parse error"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => {
      reject(reader.error || new Error("file read error"));
    };
    reader.readAsDataURL(file);
  });

const buildHistoryPayload = (
  chatMessages: { role: "user" | "ai"; text: string }[],
  fileData: FileData | null,
): GeminiHistoryPayload[] => {
  let fileAdded = false;

  return chatMessages.map((message) => {
    const parts: GeminiPartPayload[] = [{ text: message.text }];

    if (!fileAdded && fileData && message.role === "user") {
      parts.push({
        inlineData: {
          data: fileData.base64,
          mimeType: fileData.mimeType,
        },
      });
      fileAdded = true;
    }

    return {
      role: message.role === "ai" ? "model" : "user",
      parts,
    };
  });
};

type ChatBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "divider" };

const normalizeAiText = (text: string) =>
  text
    .replace(/\r/g, "\n")
    .replace(/---+/g, "\n---\n")
    .replace(/(\S)(#{1,6}\s)/g, "$1\n$2")
    .replace(/(\S)\s+(\d+\.\s+)/g, "$1\n$2")
    .replace(/(\S)\s+([*-]\s+)/g, "$1\n$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const splitChatBlocks = (rawText: string): ChatBlock[] => {
  const normalized = normalizeAiText(rawText);
  if (!normalized) return [];

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: ChatBlock[] = [];

  for (let i = 0; i < lines.length;) {
    const line = lines[i];

    if (line === "---") {
      blocks.push({ type: "divider" });
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
    i++;
  }

  return blocks;
};

const renderInline = (text: string): ReactNode[] =>
  text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={`b-${index}`}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 1) {
        return <em key={`i-${index}`}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={`c-${index}`}>{part.slice(1, -1)}</code>;
      }
      return <span key={`t-${index}`}>{part}</span>;
    });

const renderAiText = (text: string) => {
  const blocks = splitChatBlocks(text);

  if (blocks.length === 0) {
    return <div className="chat-text">{text}</div>;
  }

  return (
    <div className="chat-rich-text">
      {blocks.map((block, index) => {
        if (block.type === "divider") {
          return <div key={`d-${index}`} className="chat-divider" />;
        }

        if (block.type === "heading") {
          return (
            <div key={`h-${index}`} className="chat-heading">
              {renderInline(block.text)}
            </div>
          );
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag key={`l-${index}`} className="chat-list">
              {block.items.map((item, itemIndex) => (
                <li key={`li-${itemIndex}`}>{renderInline(item)}</li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={`p-${index}`} className="chat-paragraph">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
};

const buildChatSummary = (
  chatMessages: { role: "user" | "ai"; text: string }[],
  file: File | null,
) => {
  if (chatMessages.length === 0) {
    return "チャットの記録はまだありません。";
  }

  const sections = chatMessages.map((message) => {
    const speaker = message.role === "user" ? "ユーザー" : "AI";
    return `#### ${speaker}\n\n${message.text}`;
  });

  if (file) {
    sections.push(`#### 添付ファイル\n\n${file.name}`);
  }

  return sections.join("\n\n---\n\n");
};

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);
  const [activeFunnel, setActiveFunnel] = useState<"B2B" | "B2C" | null>(null);
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("initial");
  const [initialMessage, setInitialMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileData, setSelectedFileData] = useState<FileData | null>(
    null,
  );
  const [summary, setSummary] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");

  const [isDragging, setIsDragging] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("green");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const currentStageIndex = Math.max(
    stageSteps.findIndex((step) => step.key === stage),
    0,
  );
  const chatHintText = loading
    ? "AIが思考中です"
    : messages.length === 0
      ? "箇条書きでもOKです。まずは困りごとを短く送ってください。"
      : "追加でAIにチャットで相談できます。";
  const funnelLabel =
    activeFunnel === "B2B"
      ? "事業者向け：リスク診断"
      : activeFunnel === "B2C"
        ? "個人向け：安全診断"
        : "診断モード未選択";

  useEffect(() => {
    document.body.style.overflow = chatOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [chatOpen]);

  const startChat = (funnel: "B2B" | "B2C") => {
    setActiveFunnel(funnel);
    setMessages([]);
    setInput("");
    setStatus("");
    setLoading(false);
    setStage("initial");
    setInitialMessage("");
    setSelectedFile(null);
    setSelectedFileData(null);
    setSummary("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setSubmitStatus("");
    setSelectedPlan("green");
    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setLoading(false);
  };

  const sendMessage = async (
    messageOverride?: string,
    isFirstTurn?: boolean,
  ) => {
    const raw = messageOverride ?? input;
    const body = raw.trim();
    if (!body || loading) return;

    if (selectedFile && !selectedFileData) {
      setStatus("ファイルを読み込み中です...");
      return;
    }

    const userText =
      isFirstTurn && selectedFile
        ? `${body}\n\n【添付ファイル】${selectedFile.name}`
        : body;

    const userMessage = { role: "user" as const, text: userText };
    const historyPayload = buildHistoryPayload(messages, selectedFileData);
    const userParts: GeminiPartPayload[] = [{ text: userText }];

    if (selectedFileData && messages.length === 0) {
      userParts.push({
        inlineData: {
          data: selectedFileData.base64,
          mimeType: selectedFileData.mimeType,
        },
      });
    }

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setStatus("");

    try {
      const planKey = selectedPlan;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planKey,
          message: userText,
          messageParts: userParts,
          history: historyPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "AIからの回答取得に失敗しました");
      }
      setMessages((prev) => [...prev, { role: "ai", text: data.message }]);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "AIの回答生成に失敗しました";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setStatus("");

    if (!file) {
      setSelectedFile(null);
      setSelectedFileData(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setStatus("ファイルは8MB以下にしてください。");
      setSelectedFile(null);
      setSelectedFileData(null);
      return;
    }

    setSelectedFile(file);
    try {
      const base64 = await readFileAsBase64(file);
      setSelectedFileData({
        name: file.name,
        base64,
        mimeType: file.type || "application/octet-stream",
      });
    } catch (error) {
      console.error("file read error", error);
      setStatus("ファイルの読み込みに失敗しました。もう一度お試しください。");
      setSelectedFile(null);
      setSelectedFileData(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0] || null;
    setStatus("");

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setStatus("ファイルは8MB以下にしてください。");
      setSelectedFile(null);
      setSelectedFileData(null);
      return;
    }

    setSelectedFile(file);
    try {
      const base64 = await readFileAsBase64(file);
      setSelectedFileData({
        name: file.name,
        base64,
        mimeType: file.type || "application/octet-stream",
      });
    } catch (error) {
      console.error("file read error", error);
      setStatus("ファイルの読み込みに失敗しました。もう一度お試しください。");
      setSelectedFile(null);
      setSelectedFileData(null);
    }
  };

  const handleStepClick = (targetStage: Stage, targetIndex: number) => {
    if (targetIndex >= currentStageIndex) return;
    setStage(targetStage);
  };

  const startChatStage = () => {
    setStatus("");
    setStage("chat");
    const first =
      initialMessage.trim() || "図面や見積を確認し、診断してください。";
    sendMessage(first, true);
  };

  const finishChat = () => {
    const summaryText = buildChatSummary(messages, selectedFile);
    setSummary(summaryText);
    setStage("inquiry");
  };

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitStatus("送信中...");
    setTimeout(() => {
      setSubmitStatus("送信しました。担当者よりご連絡します。");
      setChatOpen(false);
    }, 800);
  };
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
                <li>
                  <a className="btn btn-header-cta" href="#hero-cta-anchor">
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
              <div className="action-buttons">
                <button
                  type="button"
                  className="btn btn-primary specialist-btn delay-100 animate-slide-up"
                  data-funnel="B2B"
                  data-mode="B2B"
                  id="cta-b2b"
                  onClick={() => startChat("B2B")}
                >
                  <i className="fas fa-building" aria-hidden="true" />
                  <span>事業者向け：リスク診断を開始</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary specialist-btn delay-200 animate-slide-up"
                  data-funnel="B2C"
                  data-mode="B2C"
                  id="cta-b2c"
                  onClick={() => startChat("B2C")}
                >
                  <i className="fas fa-home" aria-hidden="true" />
                  <span>個人向け：安全診断を開始</span>
                </button>
              </div>
              <div className="urgency-bar delay-300 animate-slide-up">
                本日の無料診断受付枠 残り
                <span className="highlight">{stats.remainingToday}</span>
                件
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="why-ai">
          <div className="container">
            <h2 className="section-title text-center">セカンドオピニオンの重要性</h2>
            <p className="section-subtitle text-center">
              建設業界で見落とされがちな問題を、最新AI技術で解決します。
              <br />
              今月、<span className="highlight text-amber-600 font-bold">{stats.monthlyUsers}</span>
              名がこの診断を利用しました。
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
                <h3>秋元航</h3>
                <p className="expert-title">{companyName}</p>
                <p>
                  現場経験とAI活用の両軸で、コストとリスクを同時に最適化する診断が得意です。
                  公共案件から住宅リフォームまで対応します。
                </p>
                <p className="expert-credentials">
                  保有資格: 一級建築士 / 施工管理技士
                  <br />
                  実績: 戸建て・マンション改修、RC構造、公共案件 など
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section works-section" id="works">
          <div className="container">
            <h2 className="section-title text-center">施工事例</h2>
            <div className="works-grid">
              {caseStudies.map((study, idx) => (
                <article className={`work-card animate-slide-up delay-${(idx + 1) * 100}`} key={study.title}>
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
            <h3 className="section-title text-center mb-8 text-xl">対応キーワード</h3>
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

      {chatOpen && (
        <div className="chat-modal-overlay" role="dialog" aria-modal="true">
          <div className="chat-modal">
            <div className="chat-modal-header">
              <div>
                <p className="chat-label">AIチャット診断</p>
                <p className="chat-plan">
                  {funnelLabel}
                  <span className="plan-chip">
                    選択プラン: {planLabelMap[selectedPlan]}
                  </span>
                </p>

              </div>
              <button
                type="button"
                className="chat-close-btn"
                onClick={closeChat}
                aria-label="チャットを閉じる"
              >
                ×
              </button>
            </div>
            <div className="chat-modal-body">
              <div className="chat-content">
                <div className="chat-top">
                  <div className="chat-progress">
                    {stageSteps.map((step, index) => {
                      const status =
                        index < currentStageIndex
                          ? "done"
                          : index === currentStageIndex
                            ? "active"
                            : "next";
                      return (
                        <div
                          className={`progress-step ${status}`}
                          key={step.key}
                          role={index < currentStageIndex ? "button" : undefined}
                          tabIndex={index < currentStageIndex ? 0 : -1}
                          aria-disabled={index >= currentStageIndex}
                          onClick={() => handleStepClick(step.key, index)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleStepClick(step.key, index);
                            }
                          }}
                        >
                          <div className="step-circle">{index + 1}</div>
                          <div className="step-text">
                            <p className="step-title">{step.title}</p>
                            <span className="step-desc">{step.description}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>

                <div className="chat-layout">
                  <div className="chat-main">
                    <div className="chat-card">
                      {stage === "initial" && (
                        <div className="chat-stage">
                          <div className="stage-lead">
                            <h3 className="stage-title">最初に状況をまとめましょう</h3>
                            <p className="stage-desc">
                              図面や条件がわかる資料があれば添付。未定でも自由入力でOKです。
                            </p>
                          </div>
                          <div className="stage-grid">
                            <div className="form-group">
                              <label>資料アップロード（任意）</label>
                              <div
                                className={`upload-area ${isDragging ? "dragging" : ""} ${selectedFile ? "has-file" : ""}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById("fileInput")?.click()}
                              >
                                <input
                                  id="fileInput"
                                  type="file"
                                  onChange={handleFileChange}
                                  style={{ display: "none" }}
                                />
                                <div className="upload-content">
                                  <i className={`fas ${selectedFile ? "fa-check-circle" : "fa-cloud-upload-alt"}`} aria-hidden="true" />
                                  {selectedFile ? (
                                    <div className="upload-text">
                                      <p className="upload-filename">{selectedFile.name}</p>
                                      <span className="upload-hint">クリックして変更</span>
                                    </div>
                                  ) : (
                                    <div className="upload-text">
                                      <p className="upload-label">クリックまたはドラッグ＆ドロップ</p>
                                      <span className="upload-hint">PDF・画像など8MBまで</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="form-group">
                              <label>プランを選択</label>
                              <div className="plan-options">
                                {planOptions.map((plan) => (
                                  <label
                                    key={plan.key}
                                    className={`plan-option ${selectedPlan === plan.key ? "selected" : ""}`}
                                  >
                                    <div className="plan-option-header">
                                      <input
                                        type="radio"
                                        name="plan"
                                        value={plan.key}
                                        checked={selectedPlan === plan.key}
                                        onChange={() => setSelectedPlan(plan.key)}
                                      />
                                      <span className="plan-name">{plan.label}</span>
                                    </div>
                                    <p className="plan-description">
                                      {plan.description}
                                    </p>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="form-group">
                            <label htmlFor="initialMessage">AIにチャットで相談</label>
                            <textarea
                              id="initialMessage"
                              value={initialMessage}
                              onChange={(e) => setInitialMessage(e.target.value)}
                              rows={6}
                              placeholder="例）RC造の補強で鉄筋量が増えそう。予算内で納める案がほしい　など"
                            />

                          </div>
                          <div className="chat-actions">
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={startChatStage}
                              disabled={loading}
                            >
                              AIチャットを開始
                            </button>
                            {status ? (
                              <span className="chat-status">{status}</span>
                            ) : (
                              <span className="chat-hint">開始後すぐにAIが整理します。</span>
                            )}
                          </div>
                        </div>
                      )}
                      {stage === "chat" && (
                        <div className="chat-stage">
                          <div className="stage-lead">
                            <h3 className="stage-title">AIと話しながら要点を固めます</h3>
                            <p className="stage-desc">
                              返信中は少しお待ちください。気になる点は短く送ると整理が早いです。
                            </p>
                          </div>
                          <div className="chat-messages">
                            {messages.length === 0 ? (
                              <div className="chat-empty">
                                最初の一言を送るとここに回答が表示されます。課題や希望を簡潔に書いてください。
                              </div>
                            ) : (
                              messages.map((msg, idx) => (
                                <div
                                  key={`${msg.role}-${idx}-${msg.text.slice(0, 4)}`}
                                  className={`chat-message ${msg.role}`}
                                >
                                  <div className="chat-meta">
                                    {msg.role === "user" ? "ユーザー" : "AI"}
                                  </div>
                                  {msg.role === "ai" ? (
                                    renderAiText(msg.text)
                                  ) : (
                                    <div className="chat-text">{msg.text}</div>
                                  )}
                                </div>
                              ))
                            )}
                            {loading && (
                              <div className="chat-message ai">
                                <div className="chat-meta">AI</div>
                                <div className="typing-indicator">
                                  <span></span>
                                  <span></span>
                                  <span></span>
                                </div>
                              </div>
                            )}
                            <div ref={chatEndRef} />
                          </div>
                          <div className="chat-input-area">
                            <div className="chat-input-header">
                              <span className={`status-dot ${loading ? "live" : ""}`} />
                              <p className="chat-hint">{chatHintText}</p>
                            </div>
                            <textarea
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              rows={3}
                              placeholder="追記や気になる点を入力してください。短文でOKです。"
                            />
                            <div className="chat-actions">
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => sendMessage()}
                                disabled={loading || !input.trim()}
                              >
                                {loading ? "思考中..." : "送信"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={finishChat}
                                disabled={messages.length === 0}
                              >
                                送信フォームへ進む
                              </button>
                              {status ? (
                                <span className="chat-status">{status}</span>
                              ) : (
                                <span className="chat-inline-note">
                                  AIの回答は送信前に要約されます。
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {stage === "inquiry" && (
                        <form className="chat-stage" onSubmit={submitInquiry}>
                          <div className="stage-lead">
                            <h3 className="stage-title">この内容で担当者に送信します</h3>
                            <p className="stage-desc">
                              電話が難しい場合はメールのみでも大丈夫です。
                            </p>
                          </div>
                          <div className="form-group">
                            <label>チャット要約</label>
                            <div className="chat-summary-panel">
                              {renderAiText(summary || "チャットの記録はまだありません。")}
                            </div>
                            <p className="helper-text weak">
                              AIとのやりとりをかんたんに振り返れます。
                            </p>
                          </div>
                          <div className="contact-card">
                            <div className="contact-card-head">
                              <div>
                                <p className="contact-eyebrow">ご連絡先</p>
                                <p className="contact-lead">
                                  診断内容の修正連絡やメール送付のため、お名前とご連絡先を教えてください。
                                </p>
                              </div>
                              <span className="contact-badge">記入目安: 約20秒</span>
                            </div>
                            <div className="contact-grid">
                              <div className="contact-field">
                                <div className="field-top">
                                  <div className="field-title">
                                    <span className="field-icon">
                                      <i className="fas fa-user" aria-hidden="true" />
                                    </span>
                                    <label htmlFor="customerName">お名前</label>
                                  </div>
                                  <span className="field-required">必須</span>
                                </div>
                                <input
                                  id="customerName"
                                  className="contact-input"
                                  value={customerName}
                                  onChange={(e) => setCustomerName(e.target.value)}
                                  placeholder="例) 筑波 太郎"
                                  required
                                />
                              </div>
                              <div className="contact-field">
                                <div className="field-top">
                                  <div className="field-title">
                                    <span className="field-icon">
                                      <i className="fas fa-envelope" aria-hidden="true" />
                                    </span>
                                    <label htmlFor="customerEmail">メールアドレス</label>
                                  </div>
                                  <span className="field-required">必須</span>
                                </div>
                                <input
                                  id="customerEmail"
                                  type="email"
                                  className="contact-input"
                                  value={customerEmail}
                                  onChange={(e) => setCustomerEmail(e.target.value)}
                                  placeholder="例) sample@example.com"
                                  required
                                />
                                <p className="field-note">診断結果の送付に使います。</p>
                              </div>
                              <div className="contact-field wide">
                                <div className="field-top">
                                  <div className="field-title">
                                    <span className="field-icon">
                                      <i className="fas fa-phone" aria-hidden="true" />
                                    </span>
                                    <label htmlFor="customerPhone">電話番号</label>
                                  </div>
                                  <span className="field-optional">任意</span>
                                </div>
                                <input
                                  id="customerPhone"
                                  className="contact-input"
                                  value={customerPhone}
                                  onChange={(e) => setCustomerPhone(e.target.value)}
                                  placeholder="例) 090-1234-5678"
                                />
                                <p className="field-note">
                                  メールのみでよい場合は空欄のままで問題ありません。
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="chat-actions">
                            <button
                              type="submit"
                              className="btn btn-primary"
                              disabled={!customerName.trim() || !customerEmail.trim()}
                            >
                              {submitStatus === "送信中..." ? "送信中..." : "送信"}
                            </button>
                            {submitStatus ? (
                              <span className="chat-status">{submitStatus}</span>
                            ) : (
                              <span className="chat-inline-note">
                                送信後、担当からご案内します。
                              </span>
                            )}
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
