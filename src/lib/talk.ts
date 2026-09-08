export const TITLE_MIN = 8;
export const TITLE_MAX = 80;
export const POST_MAX = 2000;

export function titleError(raw: string): string | null {
  const title = raw.replace(/\s+/g, " ").trim();
  if (title.length < TITLE_MIN) {
    return `Give the thread a title of at least ${TITLE_MIN} characters.`;
  }
  if (title.length > TITLE_MAX) {
    return `Keep titles under ${TITLE_MAX} characters.`;
  }
  return null;
}

export function postError(raw: string): string | null {
  const text = raw.trim();
  if (!text) return "Write something before posting.";
  if (text.length > POST_MAX) {
    return `Keep posts under ${POST_MAX} characters.`;
  }
  return null;
}

export function sanitizeTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, TITLE_MAX);
}

export function sanitizePost(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, POST_MAX);
}
