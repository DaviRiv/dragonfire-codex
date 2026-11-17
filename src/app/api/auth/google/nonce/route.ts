import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GOOGLE_NONCE_COOKIE, googleClientId } from "@/lib/server/google-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const nonce = randomBytes(16).toString("base64url");
  const jar = await cookies();
  jar.set(GOOGLE_NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  return NextResponse.json({ nonce, clientId: googleClientId() });
}
