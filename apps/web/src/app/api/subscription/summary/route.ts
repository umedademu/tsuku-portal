import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type PlanKey = "blue" | "green" | "gold";

const normalizePlan = (value: unknown): PlanKey | null => {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  if (normalized === "blue" || normalized === "green" || normalized === "gold") {
    return normalized;
  }
  return null;
};

export async function GET() {
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
      .select(
        "plan,status,current_period_end,cancel_at,subscription_id,customer_id",
      )
      .eq("user_id", user.id)
      .single();

    if (profileResult.error) {
      if (profileResult.error.code === "PGRST116") {
        return NextResponse.json(
          { error: "サブスク情報が見つかりませんでした。" },
          { status: 404 },
        );
      }
      throw profileResult.error;
    }

    const profile = profileResult.data;
    const plan = normalizePlan(profile.plan);
    return NextResponse.json({
      ok: true,
      plan,
      status: profile.status ?? null,
      currentPeriodEnd: profile.current_period_end ?? null,
      cancelAt: profile.cancel_at ?? null,
      subscriptionId: profile.subscription_id ?? null,
      customerId: profile.customer_id ?? null,
    });
  } catch (error) {
    console.error("Subscription summary error:", error);
    return NextResponse.json(
      { error: "サブスク情報の取得に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 },
    );
  }
}
