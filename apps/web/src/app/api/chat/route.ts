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

type GeminiInlineData = {
  data: string;
  mimeType: string;
};

type GeminiPart = {
  text?: string;
  inlineData?: GeminiInlineData;
};

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

type GeminiCandidate = {
  content?: {
    parts?: { text?: string }[];
  };
};

type RequestBody = {
  plan?: string;
  message?: string;
  messageParts?: GeminiPart[];
  history?: Array<
    | GeminiContent
    | {
        role?: string;
        text?: string;
        parts?: GeminiPart[];
      }
  >;
};

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";
const MAX_INLINE_BYTES = 8 * 1024 * 1024;

function getPromptByPlan(plan: string): string {
  const rawPrompts = process.env.PROMPTS_JSON;
  if (!rawPrompts) {
    throw new Error("PROMPTS_JSON が設定されていません");
  }
  let parsed: Record<string, { systemPrompt?: string }>;
  try {
    parsed = JSON.parse(rawPrompts);
  } catch {
    throw new Error("PROMPTS_JSON の形式が正しくありません");
  }

  const normalizedPlan = plan.toLowerCase();
  const found = parsed[normalizedPlan];
  if (!found || !found.systemPrompt) {
    throw new Error(
      `指定されたプラン(${normalizedPlan})のプロンプトが見つかりません`,
    );
  }
  return found.systemPrompt;
}

const calcInlineBytes = (data: string) => Math.ceil((data.length * 3) / 4);

function normalizeParts(parts?: unknown[]): GeminiPart[] {
  if (!Array.isArray(parts)) return [];
  const normalized: GeminiPart[] = [];

  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    const maybePart = part as Record<string, unknown>;
    const text =
      typeof maybePart.text === "string" && maybePart.text
        ? maybePart.text
        : undefined;

    let inlineData: GeminiInlineData | undefined;
    const rawInline = maybePart.inlineData as
      | { data?: unknown; mimeType?: unknown }
      | undefined;

    if (
      rawInline &&
      typeof rawInline === "object" &&
      typeof rawInline.data === "string" &&
      rawInline.data &&
      typeof rawInline.mimeType === "string" &&
      rawInline.mimeType
    ) {
      if (calcInlineBytes(rawInline.data) > MAX_INLINE_BYTES) {
        throw new Error("添付ファイルは8MB以下にしてください。");
      }
      inlineData = {
        data: rawInline.data,
        mimeType: rawInline.mimeType,
      };
    }

    if (text || inlineData) {
      normalized.push({
        ...(text ? { text } : {}),
        ...(inlineData ? { inlineData } : {}),
      });
    }
  }

  return normalized;
}

function normalizeHistory(historyInput: RequestBody["history"]): GeminiContent[] {
  if (!Array.isArray(historyInput)) return [];

  const normalized: GeminiContent[] = [];

  for (const item of historyInput) {
    if (!item || typeof item !== "object") continue;

    const roleValue = (item as { role?: string }).role;
    const role =
      roleValue === "user" || roleValue === "model" ? roleValue : null;
    if (!role) continue;

    const partsFromItem =
      "parts" in (item as Record<string, unknown>)
        ? normalizeParts((item as { parts?: unknown[] }).parts)
        : [];

    if (partsFromItem.length > 0) {
      normalized.push({ role, parts: partsFromItem });
      continue;
    }

    const text = (item as { text?: unknown }).text;
    if (typeof text === "string" && text) {
      normalized.push({ role, parts: [{ text }] });
    }
  }

  return normalized;
}

async function callGemini(systemPrompt: string, contents: GeminiContent[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が設定されていません");
  }

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 8000 },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Gemini API エラー: ${response.status} ${response.statusText} ${errorBody}`,
    );
  }

  const data: { candidates?: GeminiCandidate[] } = await response.json();
  const textParts =
    data?.candidates?.flatMap((candidate) =>
      (candidate.content?.parts || [])
        .map((part) => (typeof part?.text === "string" ? part.text : ""))
        .filter(Boolean),
    ) || [];

  const text =
    textParts.join("\n").trim() || "応答を取得できませんでした。";
  return text;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const planForPrompt = typeof body.plan === "string" ? body.plan.toLowerCase() : "blue";

    const userPartsFromBody = normalizeParts(body.messageParts);
    const userMessageText = (body.message || "").trim();
    const userParts =
      userPartsFromBody.length > 0
        ? userPartsFromBody
        : userMessageText
          ? [{ text: userMessageText }]
          : [];

    if (userParts.length === 0) {
      return NextResponse.json(
        { error: "メッセージを入力してください" },
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

    const planFromProfile = normalizePlan(profileResult.data?.plan);
    const status = normalizeStatus(profileResult.data?.status);
    const hasActivePlan = !!status && ACTIVE_SUBSCRIPTION_STATUSES.includes(status);

    const totalAnswers = usageResult.data?.total_answers ?? 0;
    const freeAnswersUsed = usageResult.data?.free_answers_used ?? 0;

    if (!hasActivePlan && freeAnswersUsed >= FREE_USAGE_LIMIT) {
      return NextResponse.json(
        {
          error: "無料枠は3回までです。プランを選んでから再開してください。",
          limitExceeded: true,
          remainingFree: 0,
          freeAnswersUsed,
          totalAnswers,
          limit: FREE_USAGE_LIMIT,
        },
        { status: 403 },
      );
    }

    const history = normalizeHistory(body.history);
    const systemPrompt = getPromptByPlan(planForPrompt);
    const userContent: GeminiContent = { role: "user", parts: userParts };
    const contents: GeminiContent[] = [...history, userContent];
    const aiText = await callGemini(systemPrompt, contents);

    const nowIso = new Date().toISOString();
    const nextTotal = totalAnswers + 1;
    const nextFree = hasActivePlan ? freeAnswersUsed : freeAnswersUsed + 1;

    const usageUpdate = await admin
      .from("usage_counts")
      .upsert({
        user_id: user.id,
        total_answers: nextTotal,
        free_answers_used: nextFree,
        last_answer_at: nowIso,
        updated_at: nowIso,
      })
      .select("total_answers,free_answers_used")
      .single();

    if (usageUpdate.error) {
      throw usageUpdate.error;
    }

    const updatedFree = usageUpdate.data?.free_answers_used ?? nextFree;
    const updatedTotal = usageUpdate.data?.total_answers ?? nextTotal;
    const remainingFree = Math.max(FREE_USAGE_LIMIT - updatedFree, 0);

    return NextResponse.json({
      message: aiText,
      totalAnswers: updatedTotal,
      freeAnswersUsed: updatedFree,
      remainingFree,
      limit: FREE_USAGE_LIMIT,
      hasActivePlan,
      plan: planFromProfile,
      status,
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "サーバーエラーが発生しました";
    const statusCode =
      error instanceof Error && error.message.includes("添付ファイル")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
