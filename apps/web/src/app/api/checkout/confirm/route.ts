import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import Stripe from "stripe";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type PlanKey = "blue" | "green" | "gold";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey && new Stripe(stripeSecretKey, {});

const normalizePlan = (value: unknown): PlanKey | null => {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  if (normalized === "blue" || normalized === "green" || normalized === "gold") {
    return normalized;
  }
  return null;
};

const normalizeStatus = (
  status: string | null | undefined,
): "active" | "incomplete" | "past_due" | "canceled" => {
  if (status === "incomplete") return "incomplete";
  if (status === "past_due") return "past_due";
  if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
    return "canceled";
  }
  return "active";
};

const toIso = (seconds: number | null | undefined) =>
  typeof seconds === "number" && Number.isFinite(seconds)
    ? new Date(seconds * 1000).toISOString()
    : null;

const getCurrentPeriodEnd = (subscription: Stripe.Subscription | string | null) => {
  if (!subscription || typeof subscription === "string") return null;

  const legacyValue = (subscription as { current_period_end?: number }).current_period_end;
  const itemValue = subscription.items?.data?.[0]?.current_period_end;
  const seconds = typeof legacyValue === "number" ? legacyValue : itemValue;
  return toIso(seconds);
};

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: "決済キーの設定が不足しています。環境変数を確認してください。" },
      { status: 500 },
    );
  }

  let sessionId = "";
  try {
    const body = await request.json();
    sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  } catch {
    return NextResponse.json({ error: "送信内容が正しくありません。" }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json(
      { error: "決済セッションIDが見つかりませんでした。" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({
    cookies: () => cookieStore as unknown as ReturnType<typeof cookies>,
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "ログインしてから再度お試しください。" },
      { status: 401 },
    );
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
  } catch (error) {
    console.error("Stripe session retrieve error:", error);
    return NextResponse.json(
      { error: "決済セッションの確認に失敗しました。もう一度お試しください。" },
      { status: 400 },
    );
  }

  const metadataUserId = session.metadata?.user_id || session.client_reference_id;
  if (metadataUserId && metadataUserId !== user.id) {
    return NextResponse.json(
      { error: "別のアカウントで作成された決済です。正しいユーザーでお試しください。" },
      { status: 403 },
    );
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json(
      {
        error: "まだ決済が完了していません。少し時間をおいてから再度お試しください。",
        paymentStatus: session.payment_status,
      },
      { status: 400 },
    );
  }

  const plan =
    normalizePlan(session.metadata?.plan) ||
    normalizePlan(
      typeof session.subscription === "object" &&
        session.subscription !== null &&
        "metadata" in session.subscription
        ? (session.subscription as Stripe.Subscription).metadata?.plan
        : null,
    );

  if (!plan) {
    return NextResponse.json(
      { error: "プラン情報の取得に失敗しました。サポートへご連絡ください。" },
      { status: 400 },
    );
  }

  const subscription = session.subscription as Stripe.Subscription | string | null;
  const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
  const subscriptionStatus = normalizeStatus(
    typeof subscription === "string" ? null : subscription?.status,
  );
  const currentPeriodEnd = getCurrentPeriodEnd(subscription);
  const cancelAt = typeof subscription === "string" ? null : toIso(subscription?.cancel_at);
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer && typeof session.customer === "object"
        ? session.customer.id
        : null;

  try {
    const admin = createSupabaseAdminClient();
    const nowIso = new Date().toISOString();
    const checkoutStatus: "open" | "complete" | "expired" =
      session.status === "open" || session.status === "expired" ? session.status : "complete";

    const checkoutPayload: {
      session_id: string;
      user_id: string;
      plan: PlanKey;
      status: "open" | "complete" | "expired";
      created_at?: string;
    } = {
      session_id: session.id,
      user_id: user.id,
      plan,
      status: checkoutStatus,
    };

    if (session.created) {
      checkoutPayload.created_at = new Date(session.created * 1000).toISOString();
    }

    const checkoutResult = await admin.from("checkout_sessions").upsert(checkoutPayload);
    if (checkoutResult.error) {
      throw checkoutResult.error;
    }

    const profileResult = await admin.from("user_profiles").upsert({
      user_id: user.id,
      customer_id: customerId,
      subscription_id: subscriptionId,
      plan,
      status: subscriptionStatus,
      current_period_end: currentPeriodEnd,
      cancel_at: cancelAt,
      updated_at: nowIso,
    });
    if (profileResult.error) {
      throw profileResult.error;
    }

    const usageResult = await admin.from("usage_counts").upsert({
      user_id: user.id,
      updated_at: nowIso,
    });
    if (usageResult.error) {
      throw usageResult.error;
    }

    return NextResponse.json({
      ok: true,
      plan,
      status: subscriptionStatus,
      currentPeriodEnd,
      customerId,
      subscriptionId,
      message: "決済内容を反映しました。診断を続けられます。",
    });
  } catch (error) {
    console.error("Checkout confirm error:", error);
    return NextResponse.json(
      { error: "決済内容の反映に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 },
    );
  }
}
