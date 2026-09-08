/**
 * Talk message board. Run: npx tsx --tsconfig tsconfig.json scripts/check-talk.ts
 */
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { postError, titleError } from "@/lib/talk";
import { isTalkCategory } from "@/lib/talk-types";
import { adMode, AD_SLOT_META } from "@/lib/ads";
import { createThread, listThreads, replyToThread } from "@/lib/server/talk";
import { registerUser } from "@/lib/server/users";

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

assert(titleError("short") !== null, "short title");
assert(titleError("Malachite soak on Shields") === null, "ok title");
assert(postError("   ") !== null, "blank post");
assert(isTalkCategory("pvp"), "pvp category");
assert(!isTalkCategory("mythic"), "reject junk category");
assert(adMode() === "house", "no ad keys means house ads");
assert(AD_SLOT_META.billboard.sizes[0][0] === 728, "wowhead leaderboard width");
assert(AD_SLOT_META.sidebar.sizes[0][0] === 300, "wowhead rectangle width");
assert(AD_SLOT_META.anchor.sizes[0][1] === 50, "mobile banner height");

async function main(): Promise<void> {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "df-talk-"));
  process.env.DRAGONFIRE_DATA = tmp;
  try {
    const created = await registerUser("ashford", "longenough");
    assert("user" in created, "register");
    if (!("user" in created)) throw new Error("register failed");
    const thread = await createThread(created.user, {
      title: "Malachite / Vhagar / Venator still the online core?",
      body: "Shields PvP. Vhagar soaks, Malachite recovers. Does Venator still finish if they bring Arrax?",
      category: "pvp",
      line: {
        name: "Online DPS core",
        troop: "shieldbearers",
        mode: "pvp",
        left: "malachite",
        vanguard: "vhagar",
        right: "venator",
      },
    });
    if ("error" in thread) throw new Error(thread.error);
    assert(thread.replyCount === 0, "new thread has no replies");
    assert(thread.line?.vanguard === "vhagar", "line attached");
    const listed = await listThreads("pvp");
    assert(listed.some((row) => row.id === thread.id), "listed in pvp");
    const replied = await replyToThread(
      thread.id,
      created.user,
      "Arrax soaks Physical. I would still run Venator if the rest of the field is Tactical.",
    );
    if ("error" in replied) throw new Error(replied.error);
    assert(replied.replyCount === 1, "one reply");
    assert(replied.replies[0]?.username === "ashford", "reply author");
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
  console.log("check-talk ok");
}

void main();
