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

export class OpenAiCallError extends Error {
  status: number;
  code: string | null;
  retryAfterMs: number | null;

  constructor(
    message: string,
    status: number,
    code: string | null,
    retryAfterMs: number | null,
  ) {
    super(message);
    this.name = "OpenAiCallError";
    this.status = status;
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(8000, Math.max(400, Math.round(seconds * 1000)));
  }
  const date = Date.parse(header);
  if (Number.isFinite(date)) {
    return Math.min(8000, Math.max(400, date - Date.now()));
  }
  return null;
}

export function parseOpenAiError(
  status: number,
  body: string,
  retryAfterHeader: string | null,
): OpenAiCallError {
  let code: string | null = null;
  let detail = "";
  try {
    const json = JSON.parse(body) as {
      error?: { message?: unknown; code?: unknown; type?: unknown };
    };
    const err = json.error;
    if (typeof err?.code === "string") code = err.code;
    if (!code && typeof err?.type === "string") code = err.type;
    if (typeof err?.message === "string") detail = err.message;
  } catch {
    detail = body.slice(0, 180);
  }
  if (
    !code &&
    /quota|billing|exceeded your current quota/i.test(detail)
  ) {
    code = "insufficient_quota";
  }
  if (!code && status === 429) code = "rate_limit_exceeded";
  const message = detail.trim() || `model-${status}`;
  return new OpenAiCallError(
    message,
    status,
    code,
    status === 429 ? parseRetryAfter(retryAfterHeader) : null,
  );
}

export function explainOpenAiFailure(
  error: unknown,
  who: "your OpenAI key" | "the server key",
): string {
  const local = "Showing a local line for now.";
  if (error instanceof OpenAiCallError) {
    if (
      error.code === "insufficient_quota" ||
      /quota|billing/i.test(error.message)
    ) {
      return `This ${who === "your OpenAI key" ? "key" : "server key"} is out of OpenAI quota. Add billing at platform.openai.com/account/billing. ${local}`;
    }
    if (error.status === 429) {
      const wait = error.retryAfterMs
        ? Math.ceil(error.retryAfterMs / 1000)
        : 20;
      return `OpenAI rate-limited ${who}. Wait about ${wait}s and send again. ${local}`;
    }
    if (error.status === 401 || error.status === 403) {
      return `OpenAI rejected ${who}. Log in again with a new secret key. ${local}`;
    }
  }
  const message = error instanceof Error ? error.message : "model failed";
  return `OpenAI failed with ${who} (${message.slice(0, 80)}). Showing a local line instead.`;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function completeMessages(
  key: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: { temperature?: number; timeoutMs?: number; maxTokens?: number },
): Promise<string> {
  let lastError: OpenAiCallError | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${openaiBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openaiModel(),
        temperature: options?.temperature ?? 0.4,
        max_tokens: options?.maxTokens ?? 700,
        messages,
      }),
      signal: AbortSignal.timeout(options?.timeoutMs ?? 25000),
    });
    if (response.ok) {
      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("empty-model");
      return text;
    }
    const body = await response.text().catch(() => "");
    lastError = parseOpenAiError(
      response.status,
      body,
      response.headers.get("retry-after"),
    );
    const quota =
      lastError.code === "insufficient_quota" ||
      /quota|billing/i.test(lastError.message);
    if (response.status !== 429 || quota || attempt === 2) {
      throw lastError;
    }
    await sleep(lastError.retryAfterMs ?? 1500 * (attempt + 1));
  }
  throw lastError ?? new Error("empty-model");
}

export async function completeChat(
  key: string,
  userPrompt: string,
): Promise<string> {
  return completeMessages(key, [
    { role: "system", content: TEAM_COMBO_SYSTEM },
    { role: "user", content: userPrompt },
  ]);
}
