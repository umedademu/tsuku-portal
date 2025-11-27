'use client';

import Link from "next/link";
import { useEffect, useState } from "react";

type PlanKey = "blue" | "green" | "gold";
type Tone = "info" | "success" | "error";

type ConfirmResponse =
  | {
      ok: true;
      plan: PlanKey;
      status: "active" | "incomplete" | "past_due" | "canceled";
      currentPeriodEnd?: string | null;
      customerId?: string | null;
      subscriptionId?: string | null;
      message?: string;
    }
  | {
      ok?: false;
      error?: string;
      paymentStatus?: string;
    };

const planLabelMap: Record<PlanKey, string> = {
  blue: "BLUEプラン",
  green: "GREENプラン",
  gold: "GOLDプラン",
};

const statusLabelMap: Record<string, string> = {
  active: "有効",
  incomplete: "支払い確認中",
  past_due: "支払い遅延",
  canceled: "解約済み",
};

const formatDateTime = (value: string | null) => {
  if (!value) return "未設定";
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

const shorten = (value: string | null | undefined) => {
  if (!value) return "-";
  return value.length <= 10 ? value : `...${value.slice(-6)}`;
};

export default function CheckoutSuccessContent({
  sessionId: initialSessionId,
}: {
  sessionId: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [statusTone, setStatusTone] = useState<Tone>("info");
  const [statusText, setStatusText] = useState("決済内容を確認しています...");
  const [plan, setPlan] = useState<PlanKey | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<
    "active" | "incomplete" | "past_due" | "canceled" | null
  >(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);

  useEffect(() => {
    if (initialSessionId) {
      setSessionId(initialSessionId);
      return;
    }

    const fromUrl =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("session_id")
        : null;
    setSessionId(fromUrl || null);
  }, [initialSessionId]);

  useEffect(() => {
    if (!sessionId) {
      setStatusTone("error");
      setStatusText("決済セッションIDが見つかりませんでした。URLをご確認ください。");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const confirm = async () => {
      setStatusTone("info");
      setStatusText("決済内容を確認し、状態を反映しています...");
      setLoading(true);

      try {
        const response = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
          signal: controller.signal,
        });
        const data = (await response.json()) as ConfirmResponse;

        if (!response.ok || !data || data.ok !== true) {
          setStatusTone("error");
          const message =
            data && "error" in data && typeof data.error === "string" && data.error
              ? data.error
              : "状態の反映に失敗しました。時間をおいて再度お試しください。";
          setStatusText(message);
          return;
        }

        setPlan(data.plan);
        setSubscriptionStatus(data.status);
        setCurrentPeriodEnd(data.currentPeriodEnd ?? null);
        setCustomerId(data.customerId ?? null);
        setSubscriptionId(data.subscriptionId ?? null);
        setStatusTone("success");
        setStatusText(data.message || "決済内容を反映しました。診断を続けられます。");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("checkout success fetch error", error);
        setStatusTone("error");
        setStatusText("通信に失敗しました。時間をおいて再度お試しください。");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void confirm();
    return () => controller.abort();
  }, [sessionId]);

  const summaryTitle =
    statusTone === "success"
      ? "反映完了"
      : statusTone === "error"
        ? "反映できませんでした"
        : "確認中";

  const statusLabel = subscriptionStatus
    ? statusLabelMap[subscriptionStatus] || subscriptionStatus
    : "確認中";

  const planLabel = plan ? planLabelMap[plan] : "プランを確認中";

  return (
    <div className="plan-page">
      <header className="plan-hero">
        <div className="container">
          <p className="plan-eyebrow">決済完了</p>
          <h1 className="plan-hero-title">Stripeでの決済が完了しました</h1>
          <p className="plan-hero-lead">
            決済内容をサーバーで検証し、プラン状態を保存しました。結果を下記にまとめています。
          </p>
          <div className="plan-hero-actions">
            <span className="plan-hero-note">
              {sessionId
                ? `セッションID末尾: ${shorten(sessionId)}`
                : "セッションIDが確認できませんでした。"}
            </span>
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
              <p className="plan-summary-label">反映ステータス</p>
              <p className="plan-summary-main">{summaryTitle}</p>
              <p className={`plan-status ${statusTone === "error" ? "error" : ""}`}>
                {statusText}
              </p>
              <p className="plan-summary-note">
                決済が成立したタイミングでプランとサブスク状態を保存します。{" "}
                {loading ? "しばらくお待ちください。" : ""}
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

          <div className="plan-grid">
            <article
              className={`plan-card ${plan || "blue"} ${
                !loading && statusTone === "success" ? "active" : ""
              }`}
            >
              <div className="plan-card-top">
                <span className="plan-badge">選択プラン</span>
                <h2 className="plan-name">{planLabel}</h2>
                <p className="plan-tagline">サブスク状態: {statusLabel}</p>
              </div>

              <p className="plan-highlight">
                {statusTone === "success"
                  ? "決済完了に合わせてプラン情報を保存しました。今後はサブスク状態に応じて利用可否を判定します。"
                  : "プラン情報の反映を進めています。数秒後に自動で更新されます。"}
              </p>

              <ul className="plan-feature-list">
                <li className="plan-feature">
                  <span className="plan-check" aria-hidden="true">
                    ✓
                  </span>
                  <span>プラン種別: {planLabel}</span>
                </li>
                <li className="plan-feature">
                  <span className="plan-check" aria-hidden="true">
                    ✓
                  </span>
                  <span>サブスク状態: {statusLabel}</span>
                </li>
                <li className="plan-feature">
                  <span className="plan-check" aria-hidden="true">
                    ✓
                  </span>
                  <span>次回更新目安: {formatDateTime(currentPeriodEnd)}</span>
                </li>
              </ul>

              <div className="plan-card-bottom">
                <p className="plan-note">
                  プランを変更する場合はプラン選択ページから新しいセッションを作成してください。
                </p>
              </div>
            </article>

            <article className="plan-card gold">
              <div className="plan-card-top">
                <span className="plan-badge">保存した控え</span>
                <h2 className="plan-name">Stripe連携のメモ</h2>
                <p className="plan-tagline">問い合わせ時に参照するIDの末尾を載せています。</p>
              </div>

              <p className="plan-highlight">
                顧客IDやサブスクIDをサーバーに保存しました。反映結果はサポート確認用のメモとして残ります。
              </p>

              <ul className="plan-feature-list">
                <li className="plan-feature">
                  <span className="plan-check" aria-hidden="true">
                    ✓
                  </span>
                  <span>セッションID: {shorten(sessionId)}</span>
                </li>
                <li className="plan-feature">
                  <span className="plan-check" aria-hidden="true">
                    ✓
                  </span>
                  <span>顧客ID: {shorten(customerId)}</span>
                </li>
                <li className="plan-feature">
                  <span className="plan-check" aria-hidden="true">
                    ✓
                  </span>
                  <span>サブスクID: {shorten(subscriptionId)}</span>
                </li>
                <li className="plan-feature">
                  <span className="plan-check" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    反映状況:{" "}
                    {statusTone === "success"
                      ? "保存完了"
                      : statusTone === "error"
                        ? "保存エラー"
                        : "確認中"}
                  </span>
                </li>
              </ul>

              <div className="plan-card-bottom">
                <p className="plan-note">
                  エラーが続く場合は、時間をおいてからもう一度開くか、サポートまでお知らせください。
                </p>
                <div className="plan-card-actions">
                  <Link href="/workspace" className="btn btn-primary">
                    診断ページへ戻る
                  </Link>
                  <Link href="/checkout/plan" className="btn btn-secondary">
                    プランを確認
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
