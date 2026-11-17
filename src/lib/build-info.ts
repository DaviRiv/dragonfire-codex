/** Stamped in next.config at dev/build time. */
export type BuildInfo = {
  number: string;
  sha: string;
};

export function readPublicBuildInfo(): BuildInfo {
  const number = process.env.NEXT_PUBLIC_BUILD_NUMBER?.trim() || "0";
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA?.trim() || "local";
  return { number, sha };
}

export function buildNumberLabel(info: BuildInfo = readPublicBuildInfo()): string {
  return `Build ${info.number}`;
}
