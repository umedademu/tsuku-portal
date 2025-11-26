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
    note: "選択結果はこのページ内で保持します。決済は次ステップで開始します。",
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
    note: "決済連携は次の工程で有効化します。ここでは選択のみ保存します。",
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
    note: "料金表示と決済開始は次のステップでStripeに接続する予定です。",
  },
];

const planLabelMap: Record<PlanKey, string> = {
  blue: "BLUEプラン",
  green: "GREENプラン",
  gold: "GOLDプラン",
};

export default function PlanPage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("green");

  return (
    <div className="plan-page">
      <header className="plan-hero">
        <div className="container">
          <p className="plan-eyebrow">サブスク準備ステップ</p>
          <h1 className="plan-hero-title">プランを選んで先へ進む</h1>
          <p className="plan-hero-lead">
            無料枠を使い切った方向けの案内です。ここではプランの見た目と説明だけを確認し、
            決済や残数との連動は次のステップでつなぎます。
          </p>
          <div className="plan-hero-actions">
            <span className="plan-hero-note">
              選択内容はこのページ内だけで保持されます。ブラウザを閉じるとリセットされます。
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
                        onClick={() => setSelectedPlan(plan.key)}
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
                ここではプランの見た目だけを確認できます。Stripeの起票や残数更新は次のステップで追加します。
              </p>
            </div>
            <div className="plan-summary-actions">
              <button type="button" className="btn btn-primary" disabled>
                決済へ進む（次ステップで接続）
              </button>
              <Link href="/workspace" className="btn btn-secondary">
                診断ページに戻る
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
