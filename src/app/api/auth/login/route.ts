import { NextResponse } from "next/server";
import { usernameKey } from "@/lib/account";
import { loginUser } from "@/lib/server/users";
import { jsonError, setSessionCookie } from "@/lib/server/session";
import { StoreFullError, StoreUnavailableError } from "@/lib/server/store-limits";
import {
  clientAddress,
  consumeRateLimits,
  LIMITS,
} from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = (await request.json()) as { username?: string; password?: string };
  } catch {
    return jsonError("Send a username and password.", 400);
  }
  const ip = clientAddress(request);
  const userKey = usernameKey(body.username ?? "");
  const limited = consumeRateLimits([
    {
      key: `login:ip:${ip}`,
      ...LIMITS.loginPerIp15m,
    },
    ...(userKey
      ? [{ key: `login:user:${userKey}`, ...LIMITS.loginPerUser15m }]
      : []),
  ]);
  if (!limited.ok) {
    return jsonError(
      `Too many sign-in attempts. Wait ${limited.retryAfterSec}s.`,
      429,
    );
  }
  try {
    const result = await loginUser(body.username ?? "", body.password ?? "");
    if ("error" in result) return jsonError(result.error, 401);
    await setSessionCookie(result.user);
    return NextResponse.json({ user: result.user });
  } catch (error) {
    if (error instanceof StoreUnavailableError || error instanceof StoreFullError) {
      return jsonError(error.message, 503);
    }
    console.error(error);
    return jsonError("Could not sign in.", 500);
  }
}
