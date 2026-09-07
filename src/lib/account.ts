export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;
export const COMMENT_MAX = 600;

const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{2,23}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim();
}

export function usernameKey(raw: string): string {
  return normalizeUsername(raw).toLowerCase();
}

export function usernameError(raw: string): string | null {
  const name = normalizeUsername(raw);
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) {
    return `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters.`;
  }
  if (!USERNAME_RE.test(name)) {
    return "Start with a letter. Use letters, numbers, and underscores.";
  }
  return null;
}

export function passwordError(raw: string): string | null {
  if (raw.length < PASSWORD_MIN || raw.length > PASSWORD_MAX) {
    return `Password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters.`;
  }
  if (!/\S/.test(raw)) return "Password cannot be blank.";
  return null;
}

export function commentError(raw: string): string | null {
  const text = raw.trim();
  if (!text) return "Write a note before posting.";
  if (text.length > COMMENT_MAX) {
    return `Keep notes under ${COMMENT_MAX} characters.`;
  }
  return null;
}

export function sanitizeComment(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, COMMENT_MAX);
}

export function nextPath(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.includes("://")) return "/";
  return value;
}
