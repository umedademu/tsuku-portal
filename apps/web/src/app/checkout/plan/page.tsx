import type { Metadata } from "next";

import PlanPage from "./_components/plan-page";

export const metadata: Metadata = {
  title: "プラン選択 | 相模建設ツクルンジャー AI診断",
  description:
    "BLUE / GREEN / GOLD の3プランを見比べるためのページです。決済開始は次のステップで行います。",
};

export default function Plan() {
  return <PlanPage />;
}
