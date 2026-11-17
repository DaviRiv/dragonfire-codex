import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  clientAddress,
  consumeRateLimit,
  LIMITS,
} from "@/lib/server/rate-limit";
import { GOOGLE_NONCE_COOKIE, verifyGoogleIdToken } from "@/lib/server/google-oauth";
import { jsonError, setSessionCookie } from "@/lib/server/session";
import { StoreFullError, StoreUnavailableError } from "@/lib/server/store-limits";
import { findOrCreateGoogleUser } from "@/lib/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = clientAddress(request);
  const limited = consumeRateLimit(
    `login:ip:${ip}`,
    LIMITS.loginPerIp15m.limit,
    LIMITS.loginPerIp15m.windowMs,
  );
  if (!limited.ok) {
    return jsonError(
      `Too many sign-in attempts. Wait ${limited.retryAfterSec}s.`,
      429,
    );
  }

  let body: { credential?: string };
  try {
    body = (await request.json()) as { credential?: string };
  } catch {
    return jsonError("Google sign-in did not finish.", 400);
  }
  const credential = body.credential?.trim() ?? "";
  if (!credential || credential.length > 8192) {
    return jsonError("Google sign-in did not finish.", 400);
  }

  const jar = await cookies();
  const nonce = jar.get(GOOGLE_NONCE_COOKIE)?.value ?? "";
  jar.delete(GOOGLE_NONCE_COOKIE);

  try {
    const profile = await verifyGoogleIdToken(credential, nonce);
    const result = await findOrCreateGoogleUser(profile);
    if ("error" in result) return jsonError(result.error, 400);
    await setSessionCookie(result.user);
    return NextResponse.json({ user: result.user });
  } catch (error) {
    if (error instanceof StoreUnavailableError || error instanceof StoreFullError) {
      return jsonError(error.message, 503);
    }
    if (
      error instanceof Error &&
      /Google|expired|verified/.test(error.message)
    ) {
      return jsonError(error.message.slice(0, 180), 401);
    }
    console.error(error);
    return jsonError("Google sign-in could not be verified.", 401);
  }
}
