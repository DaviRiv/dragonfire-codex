import { bearerFromHeader, isUserApiKey } from "@/lib/ai/keys";
import { TEAM_COMBO_SYSTEM } from "@/lib/ai/prompt";

export function openaiBaseUrl(): string {
  return (
    process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1"
  ).replace(/\/$/, "");
}

export function openaiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export function hasServerOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function keyFromRequest(
  request: Request,
): { key: string; source: "user" | "env" } | null {
  const token = bearerFromHeader(request.headers.get("authorization"));
  if (token && isUserApiKey(token)) return { key: token, source: "user" };
  const env = process.env.OPENAI_API_KEY?.trim();
  if (env) return { key: env, source: "env" };
  return null;
}

export async function verifyOpenAiKey(key: string): Promise<void> {
  const response = await fetch(`${openaiBaseUrl()}/models`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error("rejected");
  }
  if (!response.ok) {
    throw new Error(`unreachable-${response.status}`);
  }
}

export async function completeChat(
  key: string,
  userPrompt: string,
): Promise<string> {
  const response = await fetch(`${openaiBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openaiModel(),
      temperature: 0.4,
      messages: [
        { role: "system", content: TEAM_COMBO_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) {
    throw new Error(`model-${response.status}`);
  }
  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty-model");
  return text;
}
