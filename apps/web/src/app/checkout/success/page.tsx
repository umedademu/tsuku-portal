import type { Metadata } from "next";

import CheckoutSuccessContent from "./_components/checkout-success-content";

export const metadata: Metadata = {
  title: "決済完了 | 相模建設ツクルンジャー AI診断",
  description:
    "Stripeでの決済後にサーバーへ状態を反映し、診断ページへ戻れるようにします。",
};

type PageProps = {
  searchParams?: {
    session_id?: string;
  };
};

export default function CheckoutSuccessPage({ searchParams }: PageProps) {
  const sessionId =
    searchParams && typeof searchParams.session_id === "string"
      ? searchParams.session_id
      : null;

  return <CheckoutSuccessContent sessionId={sessionId} />;
}
