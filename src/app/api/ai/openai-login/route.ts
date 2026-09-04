import { NextResponse } from "next/server";
import {
  bearerFromHeader,
  hasServerOpenAiKey,
  isUserApiKey,
  verifyOpenAiKey,
} from "@/lib/ai/openai";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ serverKey: hasServerOpenAiKey() });
}

export async function POST(request: Request) {
  const token = bearerFromHeader(request.headers.get("authorization"));
  if (!token || !isUserApiKey(token)) {
    return NextResponse.json(
      {
        error:
          "Paste an OpenAI API key. It starts with sk- and comes from platform.openai.com.",
      },
      { status: 400 },
    );
  }

  try {
    await verifyOpenAiKey(token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "verify-failed";
    if (message === "rejected") {
      return NextResponse.json(
        { error: "OpenAI rejected that key. Create a new secret key and try again." },
        { status: 401 },
      );
    }
    return NextResponse.json(
      {
        error: "Could not reach OpenAI to check the key.",
        unreachable: true,
      },
      { status: 502 },
    );
  }
}
