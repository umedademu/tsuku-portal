import type { Metadata } from "next";

import PlanPage from "./_components/plan-page";

export const metadata: Metadata = {
  title: "プラン選択 | 相模建設ツクルンジャー AI診断",
  description:
    "BLUE / GREEN / GOLD の3プランを見比べ、このページから決済を始められます。",
};

export default function Plan() {
  return <PlanPage />;
}
