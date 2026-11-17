import { timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

/** Public OAuth client. The client secret stays in GOOGLE_CLIENT_SECRET only. */
const DEFAULT_GOOGLE_CLIENT_ID =
  "990622584413-jd48nhhssnu7mejhu9nv4491f78v5rue.apps.googleusercontent.com";

export function googleOAuthConfigured(): boolean {
  return googleClientId().length > 10 && googleClientSecret().length > 10;
}

export function googleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID?.trim() || DEFAULT_GOOGLE_CLIENT_ID;
}

function googleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
}

export const GOOGLE_NONCE_COOKIE = "df_google_nonce";

export function googleRedirectUri(request: Request): string {
  const origin = new URL(request.url).origin;
  return `${origin}/api/auth/google/callback`;
}

export function googleAuthUrl(request: Request, state: string): string {
  const params = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: googleRedirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export type GoogleProfile = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
};

const googleCerts = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

function nonceMatches(claim: unknown, expected: string): boolean {
  if (typeof claim !== "string" || !expected) return false;
  const left = Buffer.from(claim);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Verify a Google Identity Services ID token. No client secret is required. */
export async function verifyGoogleIdToken(
  credential: string,
  nonce: string,
): Promise<GoogleProfile> {
  const { payload } = await jwtVerify(credential, googleCerts, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: googleClientId(),
  });
  if (!nonceMatches(payload.nonce, nonce)) {
    throw new Error("Google sign-in expired. Try again.");
  }
  if (payload.email_verified === false) {
    throw new Error("That Google account has not verified its email.");
  }
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) throw new Error("Google did not return a user id.");
  return {
    sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}

export async function exchangeGoogleCode(
  request: Request,
  code: string,
): Promise<GoogleProfile> {
  const secret = googleClientSecret();
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId(),
      client_secret: secret,
      redirect_uri: googleRedirectUri(request),
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description ?? tokenJson.error ?? "Google token failed.");
  }
  const profileRes = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { authorization: `Bearer ${tokenJson.access_token}` },
    },
  );
  const profile = (await profileRes.json()) as GoogleProfile & { sub?: string };
  if (!profileRes.ok || !profile.sub) {
    throw new Error("Could not read your Google profile.");
  }
  return {
    sub: profile.sub,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
  };
}