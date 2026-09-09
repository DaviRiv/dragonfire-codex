/**
 * Team builder: several complete lines around one dragon.
 * Run: npx tsx --tsconfig tsconfig.json scripts/check-around.ts
 */
import { choicesAroundDragon, seatStars } from "@/lib/around-choices";
import { boardHasDragon } from "@/lib/boards";
import { STATUS_GLOSSARY } from "@/data/status-glossary";

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

function seatsOf(line: {
  left: string;
  vanguard: string;
  right: string;
}): string[] {
  return [line.left, line.vanguard, line.right];
}

function checkKalspire(): void {
  const six = choicesAroundDragon({
    dragonId: "kalspire",
    stars: 6,
    troop: "cavalry",
    mode: "pvp",
  });
  assert(six.length >= 10, `expected 10+ Kalspire lines, got ${six.length}`);
  assert(
    six.every((choice) => boardHasDragon(choice.line, "kalspire", 6)),
    "every line must include Kalspire at ★6",
  );
  for (const choice of six) {
    for (const id of seatsOf(choice.line)) {
      if (id === "kalspire") {
        assert(seatStars(choice.line, id) === 6, "Kalspire keeps the stepper rank");
      } else {
        assert(
          seatStars(choice.line, id) === 1,
          `${id} must stay hypothetical, not inherit Kalspire’s ★6`,
        );
      }
    }
  }
  const keys = new Set(six.map((choice) => choice.id));
  assert(
    six.some((choice) =>
      [choice.line.left, choice.line.vanguard, choice.line.right].includes(
        "arulix",
      ),
    ),
    "Kalspire cavalry book/kit must still seat Arulix",
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
  assert(lines.length >= 10, `expected 10+ Malachite lines, got ${lines.length}`);
  assert(
    lines.every((choice) => boardHasDragon(choice.line, "malachite", 6)),
    "every Malachite line must include Malachite at ★6",
  );
  const moon = lines.find((choice) => seatsOf(choice.line).includes("moondancer"));
  assert(moon, "★6 Malachite should still seat a Moondancer line");
  assert(seatStars(moon.line, "malachite") === 6, "Malachite stays ★6");
  assert(
    seatStars(moon.line, "moondancer") === 1,
    "Moondancer is hypothetical — do not copy Malachite’s stars",
  );
  assert(
    moon.pros.some((note) => /crescent blade/i.test(note.title)),
    "show the Crescent Blade pairing on the Malachite line",
  );
  assert(
    moon.cons.some(
      (note) =>
        note.title === "Moondancer’s Command maxes at 6★" &&
        note.detail?.startsWith("At 6+ Stars:"),
    ),
    "name the Hub 6+ Stars command clause on hypothetical Moondancer",
  );
}

function hasIds(
  line: { left: string; vanguard: string; right: string },
  ids: string[],
): boolean {
  const seats = seatsOf(line);
  return ids.every((id) => seats.includes(id));
}

function checkRhysarionMalachiteVenator(): void {
  for (const dragonId of ["malachite", "rhysarion", "venator"] as const) {
    const lines = choicesAroundDragon({
      dragonId,
      stars: 6,
      troop: "shieldbearers",
    });
    assert(
      lines.some((choice) =>
        hasIds(choice.line, ["rhysarion", "malachite", "venator"]),
      ),
      `${dragonId} lines must include Rhysarion / Malachite / Venator`,
    );
  }
  const cavalry = choicesAroundDragon({
    dragonId: "malachite",
    stars: 6,
    troop: "cavalry",
  });
  assert(
    cavalry.some((choice) =>
      hasIds(choice.line, ["rhysarion", "malachite", "venator"]),
    ),
    "Malachite’s default Cavalry view must still list Rhysarion / Venator",
  );

  const rhys = choicesAroundDragon({
    dragonId: "rhysarion",
    stars: 6,
    troop: "shieldbearers",
  });
  assert(rhys.length <= 16, `Rhysarion list must stay at 16 rows, got ${rhys.length}`);
  assert(
    rhys.some((choice) => choice.line.vanguard === "rhysarion"),
    "Rhysarion lines must include Vanguard seating",
  );
  assert(
    rhys.some((choice) => choice.line.left === "rhysarion"),
    "Rhysarion lines must still include Left seating",
  );
  assert(
    rhys.some(
      (choice) =>
        choice.line.vanguard === "rhysarion" &&
        hasIds(choice.line, ["rhysarion", "malachite", "venator"]),
    ),
    "Rhysarion / Malachite / Venator must appear with Rhysarion in Vanguard",
  );
}

checkKalspire();
checkMalachite();
checkRhysarionMalachiteVenator();
console.log("check-around ok");
