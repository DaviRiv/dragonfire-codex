export function isUserApiKey(value: string): boolean {
  const key = value.trim();
  return (
    key.length >= 20 &&
    key.length <= 512 &&
    /^sk-[A-Za-z0-9_-]+$/.test(key)
  );
}

export function maskOpenAiKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length < 8) return "sk-…";
  return `${trimmed.slice(0, 3)}…${trimmed.slice(-4)}`;
}

export function bearerFromHeader(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(\S+)/i);
  return match?.[1]?.trim() || null;
}
