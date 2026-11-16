import { NextResponse } from "next/server";
import { nextPath } from "@/lib/account";
import {
  clientAddress,
  consumeRateLimit,
  LIMITS,
} from "@/lib/server/rate-limit";
import {
  exchangeGoogleCode,
  googleOAuthConfigured,
} from "@/lib/server/google-oauth";
import { verifyOAuthState } from "@/lib/server/oauth-state";
import { setSessionCookie } from "@/lib/server/session";
import { findOrCreateGoogleUser, listUsers } from "@/lib/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function accountError(message: string, request: Request): NextResponse {
  const target = new URL("/account", request.url);
  target.searchParams.set("error", message.slice(0, 180));
  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  if (!googleOAuthConfigured()) {
    return accountError("Google sign-in is not set up yet.", request);
  }
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    return accountError("Google sign-in was canceled.", request);
  }
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const state = verifyOAuthState(stateRaw);
  if (!code || !state) {
    return accountError("Google sign-in expired. Try again.", request);
  }

  try {
    const profile = await exchangeGoogleCode(request, code);
    const ip = clientAddress(request);
    const known = (await listUsers()).some((row) => row.googleSub === profile.sub);
    if (!known) {
      const limited = consumeRateLimit(
        `register:ip:${ip}`,
        LIMITS.registerPerIpDay.limit,
        LIMITS.registerPerIpDay.windowMs,
      );
      if (!limited.ok) {
        return accountError("Too many sign-ups from this network today.", request);
      }
    }
    const result = await findOrCreateGoogleUser(profile);
    if ("error" in result) {
      return accountError(result.error, request);
    }
    await setSessionCookie(result.user);
    return NextResponse.redirect(new URL(nextPath(state.next), request.url));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Google sign-in failed.";
    return accountError(message, request);
  }
}