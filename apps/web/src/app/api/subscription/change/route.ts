import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import Stripe from "stripe";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type PlanKey = "blue" | "green" | "gold";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey && new Stripe(stripeSecretKey, {});

const priceMap: Record<PlanKey, string | undefined> = {
  blue: process.env.STRIPE_PRICE_BLUE,
  green: process.env.STRIPE_PRICE_GREEN,
  gold: process.env.STRIPE_PRICE_GOLD,
};

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

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: "決済キーの設定が不足しています。環境変数を確認してください。" },
      { status: 500 },
    );
  }

  let planInput = "";
  try {
    const body = await request.json();
    planInput = typeof body?.plan === "string" ? body.plan : "";
  } catch {
    return NextResponse.json({ error: "送信内容が正しくありません。" }, { status: 400 });
  }

  const plan = normalizePlan(planInput);
  if (!plan) {
    return NextResponse.json({ error: "変更先のプランを選択してください。" }, { status: 400 });
  }

  const priceId = priceMap[plan];
  if (!priceId) {
    return NextResponse.json(
      { error: "選択したプランの決済設定が見つかりませんでした。管理者へお知らせください。" },
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
          {
            error: "サブスク情報が見つかりませんでした。決済完了後にもう一度お試しください。",
          },
          { status: 404 },
        );
      }
      throw profileResult.error;
    }

    const profile = profileResult.data;
    if (!profile.subscription_id) {
      return NextResponse.json(
        { error: "サブスク契約が見つかりませんでした。決済完了後にお試しください。" },
        { status: 400 },
      );
    }

    let subscription: Stripe.Subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(profile.subscription_id, {
        expand: ["items.data.price"],
      });
    } catch (error) {
      console.error("Stripe subscription retrieve error:", error);
      return NextResponse.json(
        { error: "Stripe上のサブスク情報が取得できませんでした。少し時間をおいて再度お試しください。" },
        { status: 400 },
      );
    }

    const currentItem = subscription.items?.data?.[0];
    if (!currentItem) {
      return NextResponse.json(
        { error: "サブスクの明細が見つかりませんでした。サポートへご連絡ください。" },
        { status: 400 },
      );
    }

    const currentPriceId =
      typeof currentItem.price === "string" ? currentItem.price : currentItem.price?.id;
    if (currentPriceId === priceId) {
      return NextResponse.json(
        { error: "すでに同じプランです。別のプランを選んでください。" },
        { status: 400 },
      );
    }

    let updated: Stripe.Subscription;
    try {
      updated = await stripe.subscriptions.update(subscription.id, {
        items: [{ id: currentItem.id, price: priceId }],
        proration_behavior: "create_prorations",
        metadata: {
          ...subscription.metadata,
          user_id: subscription.metadata?.user_id || user.id,
          plan,
        },
      });
    } catch (error) {
      console.error("Stripe subscription update error:", error);
      return NextResponse.json(
        { error: "プラン変更に失敗しました。カード情報や決済状況をご確認ください。" },
        { status: 400 },
      );
    }

    const status = normalizeStatus(updated.status);
    const currentPeriodEnd = getCurrentPeriodEnd(updated);
    const cancelAt = toIsoFromSeconds(updated.cancel_at);
    const customerIdFromStripe =
      typeof updated.customer === "string" ? updated.customer : updated.customer?.id;
    const nowIso = new Date().toISOString();
    const nextPlan: PlanKey = plan;

    const updateResult = await admin.from("user_profiles").upsert({
      user_id: user.id,
      plan: nextPlan,
      status,
      subscription_id: updated.id,
      customer_id: customerIdFromStripe ?? profile.customer_id,
      current_period_end: currentPeriodEnd,
      cancel_at: cancelAt,
      updated_at: nowIso,
    });
    if (updateResult.error) {
      throw updateResult.error;
    }

    return NextResponse.json({
      ok: true,
      plan: nextPlan,
      status,
      currentPeriodEnd,
      cancelAt,
      subscriptionId: updated.id,
      customerId: customerIdFromStripe ?? profile.customer_id ?? null,
      message:
        "プランを変更しました。日割りで精算し、現在の更新日はそのまま引き継ぎます。支払い状況はステータスをご確認ください。",
    });
  } catch (error) {
    console.error("Subscription change error:", error);
    return NextResponse.json(
      { error: "プラン変更に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 },
    );
  }
}
