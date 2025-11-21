import { NextResponse } from "next/server";

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
    generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
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

  const data: { candidates?: { content?: { parts?: { text?: string }[] } }[] } =
    await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "応答を取得できませんでした。";
  return text;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const plan = body.plan?.toLowerCase() || "blue";

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

    const history = normalizeHistory(body.history);
    const systemPrompt = getPromptByPlan(plan);
    const contents = [...history, { role: "user", parts: userParts }];
    const aiText = await callGemini(systemPrompt, contents);

    return NextResponse.json({
      message: aiText,
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
