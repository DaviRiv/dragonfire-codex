import { NextResponse } from "next/server";
import {
  MAX_OPENAI_PROMPT,
  openAiPromptError,
} from "@/lib/server/openai-prompt";
import { openaiComplete, openaiConfigured } from "@/lib/server/openai";
import { openaiRateLimit } from "@/lib/server/openai-limit";
import { getSession, jsonError } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!openaiConfigured()) {
    return jsonError(
      "ChatGPT is not configured on this server. Copy the prompt instead.",
      503,
    );
  }
  const session = await getSession();
  if (!session) {
    return jsonError("Sign in to ask ChatGPT from this app.", 401);
  }
  const limited = openaiRateLimit(request, session.id);
  if (!limited.ok) {
    return jsonError(
      `${limited.message} (${limited.retryAfterSec}s). Or copy the prompt.`,
      429,
    );
  }

  let body: { prompt?: string };
  try {
    body = (await request.json()) as { prompt?: string };
  } catch {
    return jsonError("Send a prompt string.", 400);
  }
  const prompt = body.prompt?.trim() ?? "";
  const promptErr = openAiPromptError(prompt);
  if (promptErr) {
    const status =
      promptErr === "Prompt is too long for one request." ? 413 : 400;
    return jsonError(promptErr, status);
  }

  try {
    const reply = await openaiComplete(prompt);
    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ChatGPT failed.";
    if (message === "OPENAI_NOT_CONFIGURED") {
      return jsonError(
        "ChatGPT is not configured on this server. Copy the prompt instead.",
        503,
      );
    }
    if (message === "OPENAI_AUTH") {
      return jsonError(
        "The server’s OpenAI key was rejected. Check OPENAI_API_KEY in secrets.",
        502,
      );
    }
    if (message.startsWith("OPENAI_QUOTA:")) {
      return jsonError(
        "OpenAI API credits are exhausted on this key. Add billing credits on platform.openai.com, or copy the prompt.",
        402,
      );
    }
    if (message.startsWith("OPENAI_RATE_LIMIT:")) {
      return jsonError("OpenAI rate limit. Wait a moment, or copy the prompt.", 429);
    }
    return jsonError(message, 502);
  }
}