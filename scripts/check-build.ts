/**
 * The header build number is the git revision count for this checkout.
 * Run: npx tsx --tsconfig tsconfig.json scripts/check-build.ts
 */
import { execFileSync } from "node:child_process";
import { buildNumberLabel } from "@/lib/build-info";
import { readBuildInfo } from "../scripts/read-build-info.mjs";

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

function main(): void {
  const info = readBuildInfo();
  const count = execFileSync("git", ["rev-list", "--count", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const sha = execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
    encoding: "utf8",
  }).trim();

  assert(/^\d+$/.test(info.number) && info.number !== "0", "build number");
  assert(info.number === count, `build number ${info.number} is commit count ${count}`);
  assert(info.sha === sha, `build sha ${info.sha} is ${sha}`);
  assert(buildNumberLabel(info) === `Build ${count}`, "label");

  console.log(`check-build ok ${buildNumberLabel(info)} · ${info.sha}`);
}

void main();
