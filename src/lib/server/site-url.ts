/** Canonical public origin, e.g. https://dragonfirecodex.com */
export function siteOrigin(): URL | undefined {
  const raw = (process.env.SITE_URL ?? process.env.CANONICAL_URL ?? "").trim();
  if (!raw) return undefined;
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return undefined;
  }
}