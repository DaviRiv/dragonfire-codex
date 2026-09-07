import { NextResponse } from "next/server";
import { registerUser } from "@/lib/server/users";
import { jsonError, setSessionCookie } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
