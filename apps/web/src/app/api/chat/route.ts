import { NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "model";
  text: string;
};

type RequestBody = {
  plan?: string;
  message?: string;
  history?: ChatMessage[];
};

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

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
    throw new Error(`指定プラン(${normalizedPlan})のプロンプトが見つかりません`);
  }
  return found.systemPrompt;
}

async function callGemini(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が設定されていません");
  }

  const contents = history.map((item) => ({
    role: item.role,
    parts: [{ text: item.text }],
  }));

  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

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
    "回答を取得できませんでした";
  return text;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const plan = body.plan?.toLowerCase() || "blue";
    const userMessage = (body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) {
      return NextResponse.json(
        { error: "メッセージを入力してください" },
        { status: 400 },
      );
    }

    const systemPrompt = getPromptByPlan(plan);
    const aiText = await callGemini(systemPrompt, history, userMessage);

    return NextResponse.json({
      message: aiText,
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "サーバーエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
