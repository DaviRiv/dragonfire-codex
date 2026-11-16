import { NextResponse } from "next/server";
import { nextPath } from "@/lib/account";
import {
  googleAuthUrl,
  googleOAuthConfigured,
} from "@/lib/server/google-oauth";
import { createOAuthState } from "@/lib/server/oauth-state";
import { jsonError } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!googleOAuthConfigured()) {
    return jsonError("Google sign-in is not configured on this server.", 503);
  }
  const url = new URL(request.url);
  const next = nextPath(url.searchParams.get("next"));
  const state = createOAuthState(next);
  return NextResponse.redirect(googleAuthUrl(request, state));
}