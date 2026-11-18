/**
 * Copilot focus panel: Generate suggestions ranking.
 * Run: npx tsx --tsconfig tsconfig.json scripts/check-focus-suggest.ts
 */
import { samplePit } from "@/data/sample";
import { emptyPit } from "@/lib/dragons";
import { focusConfigKey, focusSuggestions } from "@/lib/focus-suggest";
import { TROOP_TYPES } from "@/lib/labels";
import type { AiLine } from "@/lib/ai/prompt";

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

const trio = (line: AiLine) => [line.left, line.vanguard, line.right];
const seatedPit = samplePit();
const sample = {
  ...seatedPit,
  lineups: seatedPit.lineups.filter((lineup) => lineup.kind !== "pit"),
};
const all = [...TROOP_TYPES];

const full = focusSuggestions(seatedPit, { dragonId: null, slot: "auto", troops: all });
assert(full.fellBack && full.lines.length > 0, "fully seated pit widens to every dragon");

const open = focusSuggestions(sample, { dragonId: null, slot: "auto", troops: all });
assert(open.lines.length > 0 && open.lines.length <= 3, "open search ranks up to three teams");
assert(open.pool === "pit" && !open.fellBack, "open search stays in the pit");
assert(
  new Set(open.lines.map((line) => trio(line).sort().join("|"))).size === open.lines.length,
  "no repeated trios",
);
assert(open.lines.every((line) => line.mode === "pvp"), "lines are PvP");

const locked = focusSuggestions(sample, {
  dragonId: "vhagar",
  slot: "auto",
  troops: ["shieldbearers"],
});
assert(locked.lines.length > 0, "Vhagar shieldbearer teams exist");
assert(
  locked.lines.every(
    (line) => trio(line).includes("vhagar") && line.troop === "shieldbearers",
  ),
  "every line keeps Vhagar and the locked troop",
);

const seated = focusSuggestions(sample, {
  dragonId: "vhagar",
  slot: "vanguard",
  troops: all,
});
assert(
  seated.lines.every((line) => line.vanguard === "vhagar"),
  "seat choice is honoured",
);

const picked = ["cavalry", "archers"] as const;
const mixed = focusSuggestions(sample, {
  dragonId: null,
  slot: "auto",
  troops: [...picked],
});
assert(
  mixed.lines.every((line) => (picked as readonly string[]).includes(line.troop)),
  "only picked troops are suggested",
);

const bare = focusSuggestions(emptyPit(), {
  dragonId: "vhagar",
  slot: "auto",
  troops: all,
});
assert(bare.fellBack && bare.pool === "hatchery", "empty pit widens to every dragon");
assert(bare.lines.length > 0, "every-dragon fallback finds a team");

assert(
  focusConfigKey({ dragonId: null, slot: "auto", troops: ["siege", "cavalry"] }) ===
    focusConfigKey({ dragonId: null, slot: "auto", troops: ["cavalry", "siege"] }),
  "troop order does not mark choices as changed",
);

const started = performance.now();
focusSuggestions(sample, { dragonId: "vhagar", slot: "auto", troops: all });
const ms = performance.now() - started;
assert(ms < 3500, `generate stays quick (${ms.toFixed(0)}ms)`);

console.log(`focus suggest: ok (${ms.toFixed(0)}ms for five troops)`);