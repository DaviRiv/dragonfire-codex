import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { authSecret } from "@/lib/server/secret";

export const SESSION_COOKIE = "df_session";
const MAX_AGE = 60 * 60 * 24 * 30;

export type SessionUser = {
  id: string;
  username: string;
};

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ name: user.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(authSecret());
}

export async function readSessionToken(
  token: string | undefined | null,
): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authSecret());
    const id = typeof payload.sub === "string" ? payload.sub : "";
    const username = typeof payload.name === "string" ? payload.name : "";
    if (!id || !username) return null;
    return { id, username };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await signSession(user);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
