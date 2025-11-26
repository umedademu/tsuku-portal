'use client';

import Link from "next/link";
import { useState } from "react";

type PlanKey = "blue" | "green" | "gold";

type PlanContent = {
  key: PlanKey;
  name: string;
  badge: string;
  tagline: string;
  highlight: string;
  features: string[];
  note: string;
};

const plans: PlanContent[] = [
  {
    key: "blue",
    name: "BLUEプラン",
    badge: "構造とコスト重視",
    tagline: "安全性と費用を先に確かめたい方向け。",
    highlight: "構造の妥当性と費用感を早めに押さえたい案件向けの基本プラン。",
    features: [
      "構造安全と基準適合を優先して確認",
      "見積もりと図面のずれを早期に把握",
      "コスト圧縮のための代替案を提示",
      "工程の基本段取りを簡潔に整理",
    ],
    note: "選択後に「決済へ進む」を押すとStripeに移動します。決済完了後の反映は次のステップで追加します。",
  },
  {
    key: "green",
    name: "GREENプラン",
    badge: "暮らしと外構を整える",
    tagline: "住まいやリフォーム周りを整理したい方向け。",
    highlight: "間取りや外構を生活目線で整えつつ、追加費用を抑えたいときに選ぶプラン。",
    features: [
      "リフォームや外構を踏まえた動線と使い勝手の整理",
      "写真や簡易資料ベースでも進行可能",
      "予算に合わせて優先順位を提案",
      "追加費用が膨らまないよう調整案を提示",
    ],
    note: "ここで選択して決済を開始できます。完了後の状態更新は次の工程で連携します。",
  },
  {
    key: "gold",
    name: "GOLDプラン",
    badge: "複数視点で精緻に確認",
    tagline: "大規模案件や抜け漏れを避けたい方向け。",
    highlight: "構造・コスト・工程をまとめて検証し、整合が取れた案を得たいときのプラン。",
    features: [
      "図面・見積もり・工程の食い違いを多角的に確認",
      "想定リスクと回避策をセットで提示",
      "長期的な維持や更新を見据えた助言",
      "複数回のやり取りを前提に深掘り",
    ],
    note: "決済ボタンでStripeに移動します。契約後の状態反映は次のステップで接続します。",
  },
];

const planLabelMap: Record<PlanKey, string> = {
  blue: "BLUEプラン",
  green: "GREENプラン",
  gold: "GOLDプラン",
};

export default function PlanPage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("green");
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState<"muted" | "error">("muted");
  const [loading, setLoading] = useState(false);

  const startCheckout = async () => {
    if (loading) return;
    setStatus("");
    setStatusTone("muted");
    setLoading(true);

    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data?.url) {
        const message =
          data?.error || "決済の開始に失敗しました。時間をおいて再度お試しください。";
        setStatus(message);
        setStatusTone("error");
        return;
      }

      window.location.href = data.url;
    } catch {
      setStatus("決済の開始に失敗しました。時間をおいて再度お試しください。");
      setStatusTone("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="plan-page">
      <header className="plan-hero">
        <div className="container">
          <p className="plan-eyebrow">サブスク準備ステップ</p>
          <h1 className="plan-hero-title">プランを選んで先へ進む</h1>
          <p className="plan-hero-lead">
            無料枠を使い切った方向けの案内です。ここでプランを選び、Stripeで決済を始めます。
            決済完了後の残数更新などは次のステップでつなぎます。
          </p>
          <div className="plan-hero-actions">
            <span className="plan-hero-note">
              ログイン状態のまま「決済へ進む」でStripeに遷移します。ブラウザを閉じると選択はリセットされます。
            </span>
            <div className="plan-hero-buttons">
              <Link href="/workspace" className="btn btn-secondary">
                診断ページに戻る
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="plan-main">
        <div className="container">
          <div className="plan-grid">
            {plans.map((plan) => {
              const isActive = plan.key === selectedPlan;
              return (
                <article
                  key={plan.key}
                  className={`plan-card ${plan.key} ${isActive ? "active" : ""}`}
                >
                  <div className="plan-card-top">
                    <span className="plan-badge">{plan.badge}</span>
                    <h2 className="plan-name">{plan.name}</h2>
                    <p className="plan-tagline">{plan.tagline}</p>
                  </div>

                  <p className="plan-highlight">{plan.highlight}</p>

                  <ul className="plan-feature-list">
                    {plan.features.map((feature, index) => (
                      <li key={`${plan.key}-feature-${index}`} className="plan-feature">
                        <span className="plan-check" aria-hidden="true">
                          ✓
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="plan-card-bottom">
                    <p className="plan-note">{plan.note}</p>
                    <div className="plan-card-actions">
                      <button
                        type="button"
                        className={`btn ${isActive ? "btn-secondary" : "btn-primary"}`}
                        onClick={() => {
                          setSelectedPlan(plan.key);
                          setStatus("");
                          setStatusTone("muted");
                        }}
                        aria-pressed={isActive}
                      >
                        {isActive ? "このプランを選択中" : "このプランを選ぶ"}
                      </button>
                      <span className="plan-cta-hint">決済連携は次のステップで有効化します。</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="plan-summary">
            <div>
              <p className="plan-summary-label">現在の選択</p>
              <p className="plan-summary-main">{planLabelMap[selectedPlan]}</p>
              <p className="plan-summary-note">
                選択したプランでStripe Checkoutを開きます。決済完了後の利用可否反映は次の工程で接続します。
              </p>
            </div>
            <div className="plan-summary-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={startCheckout}
                disabled={loading}
              >
                {loading ? "決済ページへ移動中..." : "決済へ進む"}
              </button>
              <Link href="/workspace" className="btn btn-secondary">
                診断ページに戻る
              </Link>
            </div>
            {status && (
              <p className={`plan-status ${statusTone === "error" ? "error" : ""}`} aria-live="polite">
                {status}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
