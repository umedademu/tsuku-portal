import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  FREE_USAGE_LIMIT,
  normalizePlan,
  normalizeStatus,
} from "@/lib/usage-constants";

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
    const [profileResult, usageResult] = await Promise.all([
      admin.from("user_profiles").select("plan,status").eq("user_id", user.id).maybeSingle(),
      admin
        .from("usage_counts")
        .select("total_answers,free_answers_used")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (profileResult.error && profileResult.error.code !== "PGRST116") {
      throw profileResult.error;
    }
    if (usageResult.error && usageResult.error.code !== "PGRST116") {
      throw usageResult.error;
    }

    const plan = normalizePlan(profileResult.data?.plan);
    const status = normalizeStatus(profileResult.data?.status);
    const hasActivePlan = Boolean(status && ACTIVE_SUBSCRIPTION_STATUSES.includes(status));

    const totalAnswers = usageResult.data?.total_answers ?? 0;
    const freeAnswersUsed = usageResult.data?.free_answers_used ?? 0;
    const remainingFree = Math.max(FREE_USAGE_LIMIT - freeAnswersUsed, 0);

    return NextResponse.json({
      ok: true,
      plan,
      status,
      hasActivePlan,
      totalAnswers,
      freeAnswersUsed,
      remainingFree,
      limit: FREE_USAGE_LIMIT,
    });
  } catch (error) {
    console.error("Usage summary error:", error);
    return NextResponse.json(
      { error: "利用回数の取得に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 },
    );
  }
}
