import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import Stripe from "stripe";

type PlanKey = "blue" | "green" | "gold";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe =
  stripeSecretKey &&
  new Stripe(stripeSecretKey, {
  });

const priceMap: Record<PlanKey, string | undefined> = {
  blue: process.env.STRIPE_PRICE_BLUE,
  green: process.env.STRIPE_PRICE_GREEN,
  gold: process.env.STRIPE_PRICE_GOLD,
};

const getOrigin = (request: Request) => {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
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

  const plan = planInput.toLowerCase() as PlanKey;
  const priceId = priceMap[plan];

  if (!priceId) {
    return NextResponse.json(
      { error: "選択したプランの決済情報が見つかりませんでした。" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({
    // Next.js 16のPromise戻りに合わせつつ、実体は同期オブジェクトを渡す
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

  const origin = getOrigin(request);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel?plan=${plan}`,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: {
        user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan,
        },
      },
    });

    if (!session.url) {
      throw new Error("チェックアウトのURLが取得できませんでした。");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session error:", error);
    return NextResponse.json(
      { error: "決済の開始に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 },
    );
  }
}
