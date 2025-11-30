'use client';

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";

import { supabaseBrowserClient } from "@/lib/supabase-client";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  FREE_USAGE_LIMIT,
  type PlanKey,
  type SubscriptionStatus,
} from "@/lib/usage-constants";

type ChatMessage = {
  role: "user" | "ai";
  text: string;
  pending?: boolean;
};

type AuthNotice = {
  text: string;
  tone: "success" | "info" | "error";
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

type ChatBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "divider" };

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const DEFAULT_PLAN: PlanKey = "green";
const MIN_TEXTAREA_HEIGHT = 48;
const MAX_TEXTAREA_LINES = 8;

const PLAN_LABEL_MAP: Record<PlanKey, string> = {
  blue: "BLUE",
  green: "GREEN",
  gold: "GOLD",
};

const STATUS_LABEL_MAP: Record<SubscriptionStatus, string> = {
  active: "有効",
  incomplete: "支払い確認中",
  past_due: "支払い遅延",
  canceled: "解約済み",
};

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
    .filter((line) => line && !/^#+$/.test(line));

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

const formatDateTime = (value: string | null) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
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
  chatMessages: ChatMessage[],
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

const initialMessages: ChatMessage[] = [
  {
    role: "ai",
    text: "図面や見積のファイルを添付して送ると、AIがその場で診断内容を返します。",
  },
  {
    role: "ai",
    text: "無料枠は1ユーザー3回までです。4回目以降はプラン選択に進んでください。",
  },
];

function WorkspacePageContent() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileData, setSelectedFileData] = useState<FileData | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [remainingFree, setRemainingFree] = useState(FREE_USAGE_LIMIT);
  const [usageLimit, setUsageLimit] = useState(FREE_USAGE_LIMIT);
  const [freeAnswersUsed, setFreeAnswersUsed] = useState(0);
  const [usageLoading, setUsageLoading] = useState(false);
  const [chatNotice, setChatNotice] = useState("");
  const [authNotice, setAuthNotice] = useState<AuthNotice | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [plan, setPlan] = useState<PlanKey | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [cancelAt, setCancelAt] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [planNotice, setPlanNotice] = useState<AuthNotice | null>(null);
  const [planManageOpen, setPlanManageOpen] = useState(false);
  const [planManageTab, setPlanManageTab] = useState<"change" | "cancel">("change");
  const [cancelProcessing, setCancelProcessing] = useState(false);
  const [cancelStatus, setCancelStatus] = useState<AuthNotice | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth");
  const searchParamsString = searchParams.toString();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatInputAreaRef = useRef<HTMLDivElement>(null);
  const baseTextareaHeightRef = useRef<number | null>(null);
  const baseInputMarginTopRef = useRef<number | null>(null);
  const baseInputHeightRef = useRef<number | null>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const planForChat = plan ?? DEFAULT_PLAN;
  const planClass = plan ?? "free";
  const hasActivePlan =
    !!subscriptionStatus && ACTIVE_SUBSCRIPTION_STATUSES.includes(subscriptionStatus);
  const planLabel = plan ? PLAN_LABEL_MAP[plan] : hasActivePlan ? "契約中" : "FREE";
  const statusLabel = subscriptionStatus
    ? STATUS_LABEL_MAP[subscriptionStatus] || subscriptionStatus
    : null;
  const planManageDisabled = subscriptionLoading || cancelProcessing || !userEmail;

  const applyUsageCounts = useCallback(
    (payload: {
      limit?: number;
      remainingFree?: number;
      freeAnswersUsed?: number;
      plan?: PlanKey | null;
      status?: SubscriptionStatus | null;
    }) => {
      const limitValue =
        typeof payload.limit === "number" && Number.isFinite(payload.limit)
          ? payload.limit
          : usageLimit;
      setUsageLimit(limitValue);

      if (payload.plan === "blue" || payload.plan === "green" || payload.plan === "gold") {
        setPlan(payload.plan);
      }
      if (
        payload.status === "active" ||
        payload.status === "incomplete" ||
        payload.status === "past_due" ||
        payload.status === "canceled"
      ) {
        setSubscriptionStatus(payload.status);
      }

      if (
        typeof payload.freeAnswersUsed === "number" &&
        Number.isFinite(payload.freeAnswersUsed)
      ) {
        setFreeAnswersUsed(payload.freeAnswersUsed);
      }

      if (
        typeof payload.remainingFree === "number" &&
        Number.isFinite(payload.remainingFree)
      ) {
        setRemainingFree(Math.max(payload.remainingFree, 0));
      } else if (
        typeof payload.freeAnswersUsed === "number" &&
        Number.isFinite(payload.freeAnswersUsed)
      ) {
        setRemainingFree(Math.max(limitValue - payload.freeAnswersUsed, 0));
      }
    },
    [usageLimit],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchSession = async () => {
      try {
        const { data, error } = await supabaseBrowserClient.auth.getSession();
        if (error) {
          throw error;
        }
        if (!cancelled) {
          setUserEmail(data.session?.user?.email ?? null);
        }
      } catch {
        if (!cancelled) {
          setChatNotice("ログイン状態の取得に失敗しました。再読み込みしてください。");
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    };

    void fetchSession();

    const { data: subscription } = supabaseBrowserClient.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUserEmail(session?.user?.email ?? null);
      setAuthReady(true);
    });

    return () => {
      cancelled = true;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    setAccountMenuOpen(false);
  }, [userEmail]);

  useEffect(() => {
    if (!planNotice) return;
    const timer = setTimeout(() => setPlanNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [planNotice]);

  useEffect(() => {
    if (!cancelStatus) return;
    if (cancelStatus.tone === "success") return;
    const timer = setTimeout(() => setCancelStatus(null), 8000);
    return () => clearTimeout(timer);
  }, [cancelStatus]);

  useEffect(() => {
    if (!authReady || !userEmail) return;

    const controller = new AbortController();
    const fetchProfile = async () => {
      setSubscriptionLoading(true);

      try {
        const response = await fetch("/api/subscription/summary", {
          signal: controller.signal,
        });
        const data = await response.json();

        if (controller.signal.aborted) return;

        if (response.status === 404) {
          setPlan(null);
          setSubscriptionStatus(null);
          setCancelAt(null);
          setCurrentPeriodEnd(null);
          return;
        }

        if (!response.ok || !data || data.ok !== true) {
          const message =
            (data && typeof data.error === "string" && data.error) ||
            "サブスク情報の取得に失敗しました。時間をおいて再度お試しください。";
          setChatNotice(message);
          return;
        }

        setPlan(data.plan ?? null);
        setSubscriptionStatus(data.status ?? null);
        setCancelAt(data.cancelAt ?? null);
        setCurrentPeriodEnd(data.currentPeriodEnd ?? null);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error && error.message
            ? error.message
            : "サブスク情報の取得に失敗しました。時間をおいて再度お試しください。";
        setChatNotice(message);
      } finally {
        if (!controller.signal.aborted) {
          setSubscriptionLoading(false);
        }
      }
    };

    void fetchProfile();
    return () => controller.abort();
  }, [authReady, userEmail]);

  useEffect(() => {
    if (!authReady || !userEmail) return;

    const controller = new AbortController();
    const fetchUsage = async () => {
      setUsageLoading(true);

      try {
        const response = await fetch("/api/usage/summary", {
          signal: controller.signal,
        });
        const data = await response.json();

        if (controller.signal.aborted) return;

        if (!response.ok || !data || data.ok !== true) {
          const message =
            (data && typeof data.error === "string" && data.error) ||
            "利用回数の取得に失敗しました。時間をおいて再度お試しください。";
          setChatNotice(message);
          return;
        }

        applyUsageCounts(data);
        setChatNotice("");
      } catch (error) {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error && error.message
            ? error.message
            : "利用回数の取得に失敗しました。時間をおいて再度お試しください。";
        setChatNotice(message);
      } finally {
        if (!controller.signal.aborted) {
          setUsageLoading(false);
        }
      }
    };

    void fetchUsage();
    return () => controller.abort();
  }, [applyUsageCounts, authReady, userEmail]);

  useEffect(() => {
    if (!authParam) return;

    const noticeMap: Record<string, AuthNotice> = {
      login_success: {
        text: "ログインしました。診断ページを開きました。",
        tone: "success",
      },
      signup_success: {
        text: "登録が完了しました。診断を始められます。",
        tone: "success",
      },
      signup_verified: {
        text: "メール認証が完了しました。診断を続けられます。",
        tone: "success",
      },
      signup_pending: {
        text: "仮登録が完了しました。メールのリンクで本登録を完了してください。",
        tone: "info",
      },
    };

    const found = noticeMap[authParam];
    if (!found) return;

    setAuthNotice(found);
    const params = new URLSearchParams(searchParamsString);
    params.delete("auth");
    const nextPath = params.toString() ? `/workspace?${params.toString()}` : "/workspace";
    router.replace(nextPath, { scroll: false });
  }, [authParam, router, searchParamsString]);

  useEffect(() => {
    if (!authNotice) return;
    const timer = setTimeout(() => setAuthNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [authNotice]);

  useEffect(() => {
    if (!authReady) return;
    if (userEmail) return;
    router.replace("/");
  }, [authReady, router, userEmail]);

  useEffect(() => {
    const area = chatMessagesRef.current;
    if (!area) return;
    area.scrollTop = area.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    const inputArea = chatInputAreaRef.current;
    if (!textarea || !inputArea) return;

    textarea.style.height = "auto";

    const textareaStyle = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(textareaStyle.lineHeight) || 24;
    const paddingTop = parseFloat(textareaStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(textareaStyle.paddingBottom) || 0;
    const borderTop = parseFloat(textareaStyle.borderTopWidth) || 0;
    const borderBottom = parseFloat(textareaStyle.borderBottomWidth) || 0;
    const maxHeight =
      lineHeight * MAX_TEXTAREA_LINES +
      paddingTop +
      paddingBottom +
      borderTop +
      borderBottom;

    const nextHeight = Math.min(Math.max(textarea.scrollHeight, MIN_TEXTAREA_HEIGHT), maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";

    if (baseTextareaHeightRef.current === null) {
      baseTextareaHeightRef.current = nextHeight;
    }
    if (baseInputMarginTopRef.current === null) {
      const inputAreaStyle = window.getComputedStyle(inputArea);
      baseInputMarginTopRef.current = parseFloat(inputAreaStyle.marginTop) || 0;
    }
    if (baseInputHeightRef.current === null) {
      baseInputHeightRef.current = inputArea.getBoundingClientRect().height;
    }

    const baseHeight = baseTextareaHeightRef.current;
    const extraHeight = Math.max(nextHeight - baseHeight, 0);
    const baseMargin = baseInputMarginTopRef.current ?? 0;
    const nextMargin = baseMargin - extraHeight;
    inputArea.style.marginTop = `${nextMargin}px`;

    const baseInputHeight = baseInputHeightRef.current ?? 0;
    const nextInputHeight = baseInputHeight + extraHeight;
    inputArea.style.height = `${nextInputHeight}px`;
  }, [input]);

  const handleOpenPlanManage = (tab: "change" | "cancel" = "change") => {
    setCancelStatus(null);
    setAccountMenuOpen(false);
    setPlanManageTab(tab);
    setPlanManageOpen(true);
  };

  const handleClosePlanManage = () => {
    setPlanManageOpen(false);
    setCancelStatus(null);
  };

  const handleCancelSubscription = async () => {
    if (cancelProcessing) return;
    setAccountMenuOpen(false);
    setCancelStatus(null);

    if (!plan || !subscriptionStatus) {
      setCancelStatus({
        text: "現在の契約が見つかりません。決済状況を確認してください。",
        tone: "error",
      });
      return;
    }

    if (subscriptionStatus === "canceled") {
      setCancelStatus({
        text: "すでに停止済みです。必要に応じてプラン選択から再開してください。",
        tone: "info",
      });
      return;
    }

    const confirmed = window.confirm(
      "次回更新日までは利用でき、その後自動停止します。サブスクを停止しますか？",
    );
    if (!confirmed) return;

    setCancelProcessing(true);
    const progressNotice: AuthNotice = {
      text: "解約を受け付けています。少しお待ちください。",
      tone: "info",
    };
    setPlanNotice(progressNotice);
    setCancelStatus(progressNotice);

    try {
      const response = await fetch("/api/subscription/cancel", { method: "POST" });
      const data = await response.json();

      if (!response.ok || !data || data.ok !== true) {
        const message =
          (data && typeof data.error === "string" && data.error) ||
          "解約に失敗しました。時間をおいて再度お試しください。";
        setPlanNotice({
          text: message,
          tone: "error",
        });
        return;
      }

      const nextPlan =
        data.plan === "blue" || data.plan === "green" || data.plan === "gold"
          ? (data.plan as PlanKey)
          : plan;
      const nextStatus =
        data.status === "active" ||
        data.status === "incomplete" ||
        data.status === "past_due" ||
        data.status === "canceled"
          ? (data.status as SubscriptionStatus)
          : subscriptionStatus;

      setPlan(nextPlan ?? null);
      setSubscriptionStatus(nextStatus ?? null);
      setCancelAt(data.cancelAt ?? null);
      setCurrentPeriodEnd(data.currentPeriodEnd ?? null);

      const message =
        (data && typeof data.message === "string" && data.message) ||
        (data.cancelAt
          ? `解約を受け付けました。${formatDateTime(data.cancelAt)} までは利用できます。`
          : "解約を受け付けました。現在の支払期間終了までは利用できます。");

      const notice: AuthNotice = {
        text: message,
        tone: "success",
      };
      setPlanNotice(notice);
      setCancelStatus(notice);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "解約処理でエラーが発生しました。時間をおいて再度お試しください。";
      const notice: AuthNotice = {
        text: message,
        tone: "error",
      };
      setPlanNotice(notice);
      setCancelStatus(notice);
    } finally {
      setCancelProcessing(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setAccountMenuOpen(false);
    setLoggingOut(true);

    try {
      const { error } = await supabaseBrowserClient.auth.signOut();
      if (error) {
        throw error;
      }
      setUserEmail(null);
      router.replace("/");
    } catch {
      setAuthNotice({
        text: "ログアウトに失敗しました。時間をおいて再度お試しください。",
        tone: "error",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSend = async () => {
    const body = input.trim();
    const hasBody = body.length > 0;
    const hasFile = Boolean(selectedFile);

    if ((!hasBody && !hasFile) || loading) return;
    if (!hasActivePlan && remainingFree <= 0) {
      setChatNotice("無料枠を使い切りました。プランを選んでください。");
      return;
    }
    if (selectedFile && !selectedFileData) {
      setStatus("ファイルの読み込みが終わるまでお待ちください。");
      return;
    }

    const mainText = hasBody ? body : "添付ファイルのみ送信します。内容を確認してください。";
    const text = selectedFile
      ? `${mainText}\n\n【添付ファイル】${selectedFile.name}`
      : mainText;
    const firstUserIndex = messages.findIndex((message) => message.role === "user");
    const historySource =
      firstUserIndex === -1 ? [] : messages.slice(firstUserIndex);
    const hasUserMessage = historySource.some((message) => message.role === "user");

    const userMessage: ChatMessage = { role: "user", text };
    const historyPayload = buildHistoryPayload(historySource, selectedFileData);
    const userParts: GeminiPartPayload[] = [{ text }];

    if (selectedFileData && !hasUserMessage) {
      userParts.push({
        inlineData: {
          data: selectedFileData.base64,
          mimeType: selectedFileData.mimeType,
        },
      });
    }

    setMessages((prev) => [
      ...prev,
      userMessage,
      { role: "ai", text: "Loading...", pending: true },
    ]);
    setInput("");
    setChatNotice("");
    setStatus("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planForChat,
          message: text,
          messageParts: userParts,
          history: historyPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data) {
          applyUsageCounts(data);
        }
        if (data && data.limitExceeded) {
          setChatNotice("無料枠を使い切りました。プランを選んでください。");
        }
        const message =
          (data && typeof data.error === "string" && data.error) ||
          "AIの回答取得に失敗しました。";
        throw new Error(message);
      }
      applyUsageCounts(data);
      const limitValue =
        typeof data?.limit === "number" && Number.isFinite(data.limit)
          ? data.limit
          : usageLimit;
      const freeUsedFromResponse =
        typeof data?.freeAnswersUsed === "number" && Number.isFinite(data.freeAnswersUsed)
          ? data.freeAnswersUsed
          : freeAnswersUsed;
      const remainingFromResponse =
        typeof data?.remainingFree === "number" && Number.isFinite(data.remainingFree)
          ? Math.max(data.remainingFree, 0)
          : Math.max(limitValue - freeUsedFromResponse, 0);
      setMessages((prev) => [
        ...prev.filter((message) => !message.pending),
        { role: "ai", text: data.message as string },
      ]);
      setStatus("");
      if (!hasActivePlan && remainingFromResponse <= 0) {
        setChatNotice("無料枠を使い切りました。プランを選んでください。");
      }
    } catch (error) {
      setMessages((prev) => prev.filter((message) => !message.pending));
      const message =
        error instanceof Error && error.message
          ? error.message
          : "AIの回答取得に失敗しました。";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
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
      event.target.value = "";
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
    } catch {
      setStatus("ファイルの読み込みに失敗しました。もう一度お試しください。");
      setSelectedFile(null);
      setSelectedFileData(null);
      event.target.value = "";
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0] ?? null;
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
    } catch {
      setStatus("ファイルの読み込みに失敗しました。もう一度お試しください。");
      setSelectedFile(null);
      setSelectedFileData(null);
    }
  };

  const resetMessages = () => {
    setMessages(initialMessages);
    setInput("");
    setChatNotice("");
    setStatus("");
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const isQuotaEmpty = !hasActivePlan && remainingFree <= 0;
  const quotaLabel = hasActivePlan ? "" : `残り ${remainingFree} / ${usageLimit} 回`;
  return (
    <div className="diagnosis-page">
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

      {planNotice && (
        <div className="container">
          <div className={`auth-notice ${planNotice.tone}`}>
            <div className="auth-notice-text">
              <i
                className={
                  planNotice.tone === "success"
                    ? "fas fa-check-circle"
                    : planNotice.tone === "error"
                      ? "fas fa-exclamation-circle"
                      : "fas fa-info-circle"
                }
                aria-hidden="true"
              />
              <span>{planNotice.text}</span>
            </div>
            <button
              type="button"
              className="auth-notice-close"
              onClick={() => setPlanNotice(null)}
              aria-label="通知を閉じる"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <main className="diagnosis-main">
        <div className="container">
          <div className="diagnosis-grid">
            <section className="diagnosis-panel chat-panel">
                  <div className="diagnosis-panel-head">
                    <h2 className="diagnosis-panel-title">診断AI</h2>
                    <div className="chat-auth-inline">
                      <span className={`chat-plan-tag plan-${planClass}`}>{planLabel}</span>
                      {userEmail && (
                        <div
                          className={`chat-account ${accountMenuOpen ? "open" : ""}`}
                          ref={accountMenuRef}
                        >
                          <button
                            type="button"
                            className="chat-account-button"
                            onClick={() => setAccountMenuOpen((prev) => !prev)}
                            aria-expanded={accountMenuOpen}
                            aria-haspopup="true"
                          >
                            <span className="chat-auth-main">{userEmail}</span>
                            <i
                              className={`fas fa-chevron-${accountMenuOpen ? "up" : "down"}`}
                              aria-hidden="true"
                            />
                          </button>
                          {accountMenuOpen && (
                            <div className="chat-account-menu" role="menu">
                              <button
                                type="button"
                                onClick={() => handleOpenPlanManage("change")}
                                disabled={planManageDisabled}
                                role="menuitem"
                              >
                                {cancelProcessing ? "停止を処理中..." : "プランの管理"}
                              </button>
                              <button
                                type="button"
                                onClick={handleLogout}
                                disabled={loggingOut}
                                role="menuitem"
                              >
                                {loggingOut ? "ログアウト中..." : "ログアウト"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

              {isQuotaEmpty && (
                <div className="plan-callout">
                  <div>
                    <p className="plan-callout-title">無料枠が残っていません</p>
                    <p className="plan-callout-text">
                      プランを選ぶと続けて診断できます。案内に沿って進めてください。
                    </p>
                  </div>
                  <Link href="/checkout/plan" className="btn btn-primary">
                    プランを選ぶ
                  </Link>
                </div>
              )}

              {chatNotice && <p className="chat-notice">{chatNotice}</p>}

              <div className="chat-messages" ref={chatMessagesRef}>
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}-${message.text.slice(0, 6)}`}
                    className={`chat-message ${message.role}`}
                  >
                    <div className="chat-meta">{message.role === "ai" ? "AI" : "ユーザー"}</div>
                    {message.role === "ai" ? (
                      renderAiText(message.text)
                    ) : (
                      <div className="chat-text">{message.text}</div>
                    )}
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="chat-empty">ここにこれまでの会話が並びます。</div>
                )}
              </div>

              <div className="chat-compose">
                <div className="diagnosis-row">
                  <div className="upload-panel">
                    <div
                      className={`upload-area ${isDragging ? "dragging" : ""} ${selectedFile ? "has-file" : ""}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={openFilePicker}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                      />
                      <div className="upload-content">
                        <i
                          className={`fas ${selectedFile ? "fa-check-circle" : "fa-cloud-upload-alt"}`}
                          aria-hidden="true"
                        />
                        {selectedFile ? (
                          <div className="upload-text">
                            <p className="upload-filename">{selectedFile.name}</p>
                            <span className="upload-hint">クリックして変更できます</span>
                          </div>
                        ) : (
                          <div className="upload-text">
                            <p className="upload-label">資料アップロード枠</p>
                            <p className="upload-label">ここにドラッグ＆ドロップ</p>
                            <span className="upload-hint">想定ファイル: PDF / 画像</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {status && <p className="diagnosis-status">{status}</p>}
                  </div>

                  <div className="chat-input-panel">
                    <div className="chat-input-area" ref={chatInputAreaRef}>
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        rows={1}
                        placeholder="ここに相談したい内容を入力（診断AIが返答します）"
                      />
                      <div className="chat-actions">
                        {!hasActivePlan && (
                          <span className={`quota-pill ${isQuotaEmpty ? "empty" : ""}`}>
                            {quotaLabel}
                          </span>
                        )}
                        <div className="chat-actions-right">
                          <button type="button" className="btn btn-secondary" onClick={resetMessages}>
                            履歴をリセット
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSend}
                            disabled={
                              (!input.trim() && !selectedFile) || isQuotaEmpty || loading || usageLoading
                            }
                          >
                            {usageLoading
                              ? "残数を確認中..."
                              : isQuotaEmpty
                                ? "残り0回のため送信不可"
                                : loading
                                  ? "送信中..."
                                  : "送信"}
                          </button>
                          {isQuotaEmpty && (
                            <Link href="/checkout/plan" className="btn btn-secondary">
                              プランを確認
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {planManageOpen && (
        <div
          className="plan-manage-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleClosePlanManage();
            }
          }}
        >
          <div className="plan-manage-dialog">
            <div className="plan-manage-header">
              <div>
                <p className="plan-manage-eyebrow">プランの管理</p>
                <h3 className="plan-manage-title">変更と停止をまとめて操作</h3>
                <p className="plan-manage-lead">
                  現在の契約状況に合わせてプランを切り替えるか、次回更新で停止するかを選べます。
                </p>
              </div>
              <div className="plan-manage-header-actions">
                <span className={`chat-plan-tag plan-${planClass}`}>{planLabel}</span>
                {statusLabel && <span className="plan-manage-state">状態: {statusLabel}</span>}
                <button
                  type="button"
                  className="plan-manage-close"
                  onClick={handleClosePlanManage}
                  aria-label="プラン管理を閉じる"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="plan-manage-body">
              <div className="plan-manage-nav" role="tablist" aria-label="プラン管理メニュー">
                <button
                  type="button"
                  className={`plan-manage-tab ${planManageTab === "change" ? "active" : ""}`}
                  onClick={() => {
                    setPlanManageTab("change");
                    setCancelStatus(null);
                  }}
                  role="tab"
                  aria-selected={planManageTab === "change"}
                >
                  プランの変更
                </button>
                <button
                  type="button"
                  className={`plan-manage-tab ${planManageTab === "cancel" ? "active" : ""}`}
                  onClick={() => {
                    setPlanManageTab("cancel");
                  }}
                  role="tab"
                  aria-selected={planManageTab === "cancel"}
                >
                  サブスクの停止
                </button>
              </div>

              <div className="plan-manage-content">
                {planManageTab === "change" ? (
                  <div className="plan-manage-panel" role="tabpanel" aria-label="プランの変更">
                    <div className="plan-change-card plan-manage-card">
                      <div className="plan-change-head">
                        <div>
                          <h3 className="plan-change-title">プランの変更</h3>
                          <p className="plan-change-lead">
                            現在の契約状況を確認し、必要ならプラン選択ページで切り替えてください。
                          </p>
                        </div>
                      </div>

                      <div className="plan-change-meta">
                        <span className="plan-cancel-pill">
                          プラン: {plan ? PLAN_LABEL_MAP[plan] : "未契約"}　状態: {statusLabel ?? "未取得"}
                        </span>
                        <span className="plan-cancel-pill muted">
                          次回更新日: {currentPeriodEnd ? formatDateTime(currentPeriodEnd) : "未設定"}
                        </span>
                        <span className="plan-cancel-pill warning">
                          停止予定: {cancelAt ? formatDateTime(cancelAt) : "未設定"}
                        </span>
                      </div>

                      <div className="plan-change-actions">
                        <div className="plan-change-notes">
                          <p>プランの切り替えは「プランを選択する」から進んでください。</p>
                        </div>
                        <div className="plan-change-buttons">
                          <Link href="/checkout/plan" className="btn btn-secondary">
                            プランを選択する
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="plan-manage-panel" role="tabpanel" aria-label="サブスクの停止">
                    <div className="plan-cancel-card">
                      <div className="plan-cancel-head">
                        <p className="plan-cancel-eyebrow">サブスクの停止</p>
                        <h3 className="plan-cancel-title">更新日前に自動停止を予約</h3>
                        <p className="plan-cancel-lead">
                          停止しても次回更新日までは利用できます。再開する際は改めてプランを選択してください。
                        </p>
                      </div>
                      <div className="plan-cancel-meta">
                        <span className="plan-cancel-pill">
                          プラン: {plan ? PLAN_LABEL_MAP[plan] : "未契約"}
                        </span>
                        {statusLabel && <span className="plan-cancel-pill muted">状態: {statusLabel}</span>}
                        {cancelAt && (
                          <span className="plan-cancel-pill warning">
                            停止予定: {formatDateTime(cancelAt)}
                          </span>
                        )}
                        {currentPeriodEnd && (
                          <span className="plan-cancel-pill muted">
                            更新日: {formatDateTime(currentPeriodEnd)}
                          </span>
                        )}
                      </div>
                      <div className="plan-cancel-body">
                        <ul className="plan-cancel-list">
                          <li>停止後は次回更新日に自動で課金が止まります。</li>
                          <li>更新日までは診断を通常通り利用できます。</li>
                          <li>再開する場合はプラン選択手続きを別途行ってください。</li>
                        </ul>
                        <div className="plan-cancel-actions">
                          <button
                            type="button"
                            className="btn plan-cancel-button"
                            onClick={handleCancelSubscription}
                            disabled={
                              cancelProcessing ||
                              subscriptionLoading ||
                              !plan ||
                              subscriptionStatus === "canceled"
                            }
                          >
                            {cancelProcessing ? "停止を処理中..." : "サブスクリプションをキャンセルする"}
                          </button>
                        </div>
                        {cancelStatus && (
                          <div className={`plan-change-status ${cancelStatus.tone}`}>
                            <p className="plan-change-status-text">{cancelStatus.text}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="diagnosis-page">読み込み中です…</div>}>
      <WorkspacePageContent />
    </Suspense>
  );
}
