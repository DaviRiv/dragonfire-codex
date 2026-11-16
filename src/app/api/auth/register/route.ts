import { NextResponse } from "next/server";
import { registerUser } from "@/lib/server/users";
import { jsonError, setSessionCookie } from "@/lib/server/session";
import {
  clientAddress,
  consumeRateLimit,
  LIMITS,
} from "@/lib/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = clientAddress(request);
  const limited = consumeRateLimit(
    `register:ip:${ip}`,
    LIMITS.registerPerIpDay.limit,
    LIMITS.registerPerIpDay.windowMs,
  );
  if (!limited.ok) {
    return jsonError(
      `Too many accounts from this network. Try again in ${limited.retryAfterSec}s.`,
      429,
    );
  }
  let body: { username?: string; password?: string };
  try {
    body = (await request.json()) as { username?: string; password?: string };
  } catch {
    return jsonError("Send a username and password.", 400);
  }
  const result = await registerUser(body.username ?? "", body.password ?? "");
  if ("error" in result) return jsonError(result.error, 400);
  await setSessionCookie(result.user);
  return NextResponse.json({ user: result.user });
}
