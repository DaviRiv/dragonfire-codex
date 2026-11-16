import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { authSecret } from "@/lib/server/secret";

const MAX_AGE_MS = 10 * 60 * 1000;

type Payload = {
  next: string;
  nonce: string;
  exp: number;
};

function sign(body: string): string {
  return createHmac("sha256", authSecret()).update(body).digest("base64url");
}

export function createOAuthState(next: string): string {
  const payload: Payload = {
    next,
    nonce: randomUUID(),
    exp: Date.now() + MAX_AGE_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyOAuthState(token: string | null | undefined): Payload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  try {
    const a = Buffer.from(sig, "base64url");
    const b = Buffer.from(expected, "base64url");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
  } catch {
    return null;
  }
  if (!payload.nonce || !payload.next || !Number.isFinite(payload.exp)) return null;
  if (Date.now() > payload.exp) return null;
  return payload;
}