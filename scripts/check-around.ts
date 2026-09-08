/**
 * Team builder: several complete lines around one dragon.
 * Run: npx tsx --tsconfig tsconfig.json scripts/check-around.ts
 */
import { choicesAroundDragon } from "@/lib/around-choices";
import { boardHasDragon } from "@/lib/boards";
import { STATUS_GLOSSARY } from "@/data/status-glossary";

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

function checkKalspire(): void {
  const six = choicesAroundDragon({
    dragonId: "kalspire",
    stars: 6,
    troop: "cavalry",
    mode: "pvp",
  });
  assert(six.length >= 3, `expected 3+ Kalspire lines, got ${six.length}`);
  assert(
    six.every((choice) => boardHasDragon(choice.line, "kalspire", 6)),
    "every line must include Kalspire at ★6",
  );
  const keys = new Set(six.map((choice) => choice.id));
  assert(keys.size === six.length, "Kalspire lines must be unique");
  assert(
    six.every(
      (choice) =>
        Boolean(choice.line.left) &&
        Boolean(choice.line.vanguard) &&
        Boolean(choice.line.right) &&
        new Set([choice.line.left, choice.line.vanguard, choice.line.right])
          .size === 3,
    ),
    "every choice must be a complete three",
  );
  assert(
    six.every((choice) => choice.pros.length + choice.cons.length > 0),
    "each team needs at least one pro or con",
  );
  const panic = six.filter((choice) =>
    choice.pros.some(
      (note) =>
        note.title === "Kalspire applies Panic" &&
        note.detail === STATUS_GLOSSARY.Panic,
    ),
  );
  assert(
    panic.length === six.length,
    "★6 Kalspire lines must list Panic from Hub + glossary",
  );
  assert(
    six.every(
      (choice) => !choice.cons.some((note) => note.title === "Kalspire has Panic at 6★"),
    ),
    "★6 is already the Panic gate — do not list it as a missing star con",
  );

  const four = choicesAroundDragon({
    dragonId: "kalspire",
    stars: 4,
    troop: "cavalry",
    mode: "pvp",
  });
  assert(four.length >= 1, "★4 Kalspire still seats a line");
  assert(
    four.every(
      (choice) => !choice.pros.some((note) => note.title === "Kalspire applies Panic"),
    ),
    "Panic is habit 3 (6★) — ★4 must not list it",
  );
}

function checkMalachite(): void {
  const lines = choicesAroundDragon({
    dragonId: "malachite",
    stars: 6,
    troop: "shieldbearers",
    mode: "pvp",
  });
  assert(lines.length >= 3, `expected 3+ Malachite lines, got ${lines.length}`);
  assert(
    lines.every((choice) => boardHasDragon(choice.line, "malachite", 6)),
    "every Malachite line must include Malachite",
  );
}

checkKalspire();
checkMalachite();
console.log("check-around ok");
