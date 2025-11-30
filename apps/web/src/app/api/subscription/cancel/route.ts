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

const toIsoFromSeconds = (seconds: number | null | undefined) =>
  typeof seconds === "number" && Number.isFinite(seconds)
    ? new Date(seconds * 1000).toISOString()
    : null;

const getCurrentPeriodEnd = (subscription: Stripe.Subscription | null) => {
  if (!subscription) return null;

  const legacyValue = (subscription as { current_period_end?: number }).current_period_end;
  const itemValue = subscription.items?.data?.[0]?.current_period_end;
  const seconds = typeof legacyValue === "number" ? legacyValue : itemValue;
  return toIsoFromSeconds(seconds);
};

export async function POST() {
  if (!stripe) {
    return NextResponse.json(
      { error: "決済キーの設定が不足しています。環境変数を確認してください。" },
      { status: 500 },
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

  try {
    const admin = createSupabaseAdminClient();
    const profileResult = await admin
      .from("user_profiles")
      .select("plan,subscription_id,customer_id")
      .eq("user_id", user.id)
      .single();

    if (profileResult.error) {
      if (profileResult.error.code === "PGRST116") {
        return NextResponse.json(
          { error: "サブスク情報が見つかりませんでした。決済完了後に再度お試しください。" },
          { status: 404 },
        );
      }
      throw profileResult.error;
    }

    const profile = profileResult.data;
    if (!profile.subscription_id) {
      return NextResponse.json(
        { error: "サブスクの契約情報が見つかりませんでした。サポートへご連絡ください。" },
        { status: 400 },
      );
    }

    let subscription: Stripe.Subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(profile.subscription_id);
    } catch (error) {
      console.error("Stripe subscription retrieve error:", error);
      return NextResponse.json(
        { error: "Stripe上のサブスク情報が取得できませんでした。少し時間をおいて再度お試しください。" },
        { status: 400 },
      );
    }

    const planFromStripe = normalizePlan(subscription.metadata?.plan);
    const plan = planFromStripe || normalizePlan(profile.plan);
    const currentPeriodEnd = getCurrentPeriodEnd(subscription);
    const cancelAtFromStripe =
      toIsoFromSeconds(subscription.cancel_at) || currentPeriodEnd;
    const customerIdFromStripe =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;

    if (subscription.status === "canceled") {
      const finalStatus = "canceled" as const;
      const updateResult = await admin.from("user_profiles").upsert({
        user_id: user.id,
        plan,
        status: finalStatus,
        subscription_id: subscription.id,
        customer_id: customerIdFromStripe ?? profile.customer_id,
        current_period_end: currentPeriodEnd,
        cancel_at: cancelAtFromStripe,
        updated_at: new Date().toISOString(),
      });
      if (updateResult.error) {
        throw updateResult.error;
      }

      return NextResponse.json({
        ok: true,
        alreadyCanceled: true,
        status: finalStatus,
        plan,
        cancelAt: cancelAtFromStripe,
        currentPeriodEnd,
        message: "すでに解約済みです。再開する場合はプラン選択から契約してください。",
      });
    }

    if (subscription.cancel_at_period_end) {
      const status = normalizeStatus(subscription.status);
      const updateResult = await admin.from("user_profiles").upsert({
        user_id: user.id,
        plan,
        status,
        subscription_id: subscription.id,
        customer_id: customerIdFromStripe ?? profile.customer_id,
        current_period_end: currentPeriodEnd,
        cancel_at: cancelAtFromStripe,
        updated_at: new Date().toISOString(),
      });
      if (updateResult.error) {
        throw updateResult.error;
      }

      return NextResponse.json({
        ok: true,
        alreadyRequested: true,
        status,
        plan,
        cancelAt: cancelAtFromStripe,
        currentPeriodEnd,
        message: cancelAtFromStripe
          ? `解約は既に受付済みです。${new Date(cancelAtFromStripe).toLocaleString("ja-JP", {
              timeZone: "Asia/Tokyo",
            })} までは利用できます。`
          : "解約は既に受付済みです。次回更新日までは利用できます。",
      });
    }

    let cancelledSubscription: Stripe.Subscription;
    try {
      cancelledSubscription = await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });
    } catch (error) {
      console.error("Stripe subscription cancel error:", error);
      return NextResponse.json(
        { error: "解約処理に失敗しました。時間をおいて再度お試しください。" },
        { status: 400 },
      );
    }

    const status = normalizeStatus(cancelledSubscription.status);
    const periodEnd = getCurrentPeriodEnd(cancelledSubscription) || currentPeriodEnd;
    const cancelAt =
      toIsoFromSeconds(cancelledSubscription.cancel_at) || cancelAtFromStripe || periodEnd;
    const nowIso = new Date().toISOString();

    const updateResult = await admin.from("user_profiles").upsert({
      user_id: user.id,
      plan,
      status,
      subscription_id: cancelledSubscription.id,
      customer_id: customerIdFromStripe ?? profile.customer_id,
      current_period_end: periodEnd,
      cancel_at: cancelAt,
      updated_at: nowIso,
    });
    if (updateResult.error) {
      throw updateResult.error;
    }

    return NextResponse.json({
      ok: true,
      status,
      plan,
      cancelAt,
      currentPeriodEnd: periodEnd,
      message: cancelAt
        ? `解約を受け付けました。${new Date(cancelAt).toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
          })} までは利用できます。`
        : "解約を受け付けました。現在の支払期間終了までは利用できます。",
    });
  } catch (error) {
    console.error("Subscription cancel error:", error);
    return NextResponse.json(
      { error: "解約処理に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 },
    );
  }
}
