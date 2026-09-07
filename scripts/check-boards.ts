/**
 * Boards copilot + account helpers.
 * Run: npx tsx --tsconfig tsconfig.json scripts/check-boards.ts
 */
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { preferredSlot, suggestTeamsAround } from "@/lib/ai/around";
import {
  commentError,
  nextPath,
  passwordError,
  usernameError,
} from "@/lib/account";
import {
  averageStars,
  boardFingerprint,
  boardHasDragon,
} from "@/lib/boards";
import { getCatalogDragon } from "@/data/dragons";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import { upsertSuggestedLines, queryBoards, rateBoard } from "@/lib/server/boards";
import { registerUser, loginUser } from "@/lib/server/users";

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

const vhagar = getCatalogDragon("vhagar");
const malachite = getCatalogDragon("malachite");
const venator = getCatalogDragon("venator");
assert(vhagar && malachite && venator, "missing catalog dragons");
assert(preferredSlot(vhagar) === "vanguard", "Vhagar should soak in Vanguard");
assert(preferredSlot(malachite) === "left", "Malachite should sit Left");
assert(preferredSlot(venator) === "right", "Venator should finish Right");

const around = suggestTeamsAround({
  dragonId: "malachite",
  stars: 6,
  troop: "shieldbearers",
  mode: "pvp",
});
assert(around.length >= 3, `expected 3+ Malachite lines, got ${around.length}`);
assert(
  around.every((line) => boardHasDragon(line, "malachite", 6)),
  "every Copilot line must include Malachite at ★6",
);
const keys = new Set(around.map((line) => boardFingerprint(line)));
assert(keys.size === around.length, "Copilot lines must be unique");
assert(
  around.some(
    (line) =>
      line.left === "malachite" &&
      line.vanguard === "vhagar" &&
      line.right === "venator",
  ),
  "shield PvP Malachite should still seat the online DPS core",
);

assert(averageStars([]) === null, "empty average");
assert(averageStars([5, 4, 5]) === 4.7, `average 4.7, got ${averageStars([5, 4, 5])}`);
assert(usernameError("ab") !== null, "short username");
assert(usernameError("ashford") === null, "valid username");
assert(passwordError("short") !== null, "short password");
assert(passwordError("longenough") === null, "valid password");
assert(commentError("   ") !== null, "blank comment");
assert(nextPath("https://evil.example") === "/", "reject absolute next");
assert(nextPath("/coach") === "/coach", "allow local next");

async function main(): Promise<void> {

const hashed = await hashPassword("longenough");
assert(await verifyPassword("longenough", hashed.salt, hashed.hash), "hash roundtrip");
assert(
  !(await verifyPassword("wrong-pass", hashed.salt, hashed.hash)),
  "wrong password must fail",
);

const tmp = await mkdtemp(path.join(os.tmpdir(), "df-boards-"));
process.env.DRAGONFIRE_DATA = tmp;
try {
  const created = await registerUser("ashford", "longenough");
  assert("user" in created, "register should succeed");
  const taken = await registerUser("Ashford", "longenough");
  assert("error" in taken, "usernames are unique ignoring case");
  const signed = await loginUser("ashford", "longenough");
  assert("user" in signed, "login should succeed");
  if (!("user" in signed) || !("user" in created)) {
    throw new Error("register/login failed");
  }
  const stored = await upsertSuggestedLines(around.slice(0, 3), signed.user.id);
  assert(stored.length === 3, "upsert returns suggested boards");
  const rated = await rateBoard(stored[0].id, signed.user, 5);
  if ("error" in rated) throw new Error(rated.error);
  assert(rated.average === 5 && rated.myRating === 5, "five-star average");
  const listed = await queryBoards({
    dragonId: "malachite",
    stars: 6,
    viewerId: signed.user.id,
  });
  assert(listed.length >= 1, "query should find Malachite ★6 boards");
  assert(listed[0].myRating === 5 || listed.some((row) => row.myRating === 5), "viewer rating");
} finally {
  await rm(tmp, { recursive: true, force: true });
}
  console.log("check-boards ok");
}

void main();
