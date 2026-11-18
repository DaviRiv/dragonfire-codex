import { execFileSync } from "node:child_process";

function git(args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function repoSlug() {
  const owner = process.env.VERCEL_GIT_REPO_OWNER?.trim();
  const slug = process.env.VERCEL_GIT_REPO_SLUG?.trim();
  if (owner && slug) return `${owner}/${slug}`;
  return "DaviRiv/dragonfire-codex";
}

/** Commit count for a shallow Vercel checkout, which only has the tip commit. */
function countOnGitHub(fullSha) {
  const url = `https://api.github.com/repos/${repoSlug()}/commits?per_page=1&sha=${encodeURIComponent(fullSha)}`;
  try {
    const headers = execFileSync(
      "curl",
      [
        "-fsS",
        "-D",
        "-",
        "-o",
        "/dev/null",
        "-H",
        "accept: application/vnd.github+json",
        "-H",
        "user-agent: dragonfire-build-info",
        url,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const match = headers.match(/[?&]page=(\d+)>;\s*rel="last"/);
    if (match?.[1]) return match[1];
    return /^\s*HTTP\/\S+\s+200\b/m.test(headers) ? "1" : "";
  } catch {
    return "";
  }
}

/** Tip commit SHA for CLI Vercel uploads that strip `.git`. */
function shaOnGitHub() {
  const url = `https://api.github.com/repos/${repoSlug()}/commits/main`;
  try {
    const raw = execFileSync(
      "curl",
      [
        "-fsS",
        "-H",
        "accept: application/vnd.github.sha",
        "-H",
        "user-agent: dragonfire-build-info",
        url,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return /^[0-9a-f]{7,40}$/i.test(raw) ? raw : "";
  } catch {
    return "";
  }
}

export function readBuildInfo() {
  let full = (
    process.env.VERCEL_GIT_COMMIT_SHA || git(["rev-parse", "HEAD"])
  ).trim();
  if (!full && process.env.VERCEL === "1") {
    full = shaOnGitHub();
  }
  const sha = full ? full.slice(0, 7) : "local";
  const shallow = git(["rev-parse", "--is-shallow-repository"]) === "true";
  let number = "";
  if (!shallow) number = git(["rev-list", "--count", "HEAD"]);
  if (!/^\d+$/.test(number) && full && process.env.VERCEL === "1") {
    number = countOnGitHub(full);
  }
  if (!/^\d+$/.test(number)) number = "0";
  return { number, sha };
}
