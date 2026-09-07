export type StatusPolarity = "buff" | "debuff" | "spread";

const BUFF_NAMES = new Set(
  [
    "First-Strike",
    "Double-Strike",
    "Advantage",
    "Resistance",
    "Protect",
    "Evade",
    "Cleanse",
    "Bulwark",
    "Taunt",
    "Stolen Flock",
    "Resilient Bond",
    "Mirage",
    "Immunity",
  ].map(keyName),
);

const DEBUFF_NAMES = new Set(
  [
    "Overwhelm",
    "Burn",
    "Bleed",
    "Panic",
    "Stun",
    "Slow",
    "Weakened",
    "Confusion",
    "Stagger",
    "Vulnerable",
    "Prey",
    "Control",
  ].map(keyName),
);

/** Named abilities granted onto an ally — spreading buffs, not the dragon's Command. */
const SPREAD_NAMES = new Set(["Crescent Blade"].map(keyName));

export function keyName(value: string): string {
  return value.replace(/[’']/g, "'").trim().toLowerCase();
}

export function polarityFromBody(body: string): StatusPolarity {
  const text = body.replace(/\s+/g, " ").toLowerCase();
  if (!text.trim()) return "buff";
  if (/prevents the target from using/.test(text)) return "debuff";
  if (
    /^when this target/.test(text) ||
    (/^grant /.test(text) &&
      / to (?:1 |an |the )?(?:ally|allies|sentinel|hunter|warrior|champion)/.test(
        text,
      ))
  ) {
    return "spread";
  }
  if (/damage received/.test(text)) {
    if (/reduces?|decreases?/.test(text)) return "buff";
    if (/increases?/.test(text)) return "debuff";
  }
  if (/recovery received/.test(text) && /reduces?|decreases?/.test(text)) {
    return "debuff";
  }
  if (
    /increases?/.test(text) &&
    /(damage dealt|recovery dealt|strength|instinct|intelligence|initiative|basic attack)/.test(
      text,
    )
  ) {
    return "buff";
  }
  if (
    /reduces?|decreases?/.test(text) &&
    /(damage dealt|strength|instinct|intelligence|initiative|recovery)/.test(text)
  ) {
    return "debuff";
  }
  if (/\bafflict|\binflict/.test(text)) return "debuff";
  if (/\bgrant|\bcauses the target to act/.test(text)) return "buff";
  return "buff";
}

export function namedStatusPolarity(name: string): StatusPolarity | null {
  const key = keyName(name);
  if (!key) return null;
  if (BUFF_NAMES.has(key)) return "buff";
  if (DEBUFF_NAMES.has(key)) return "debuff";
  if (SPREAD_NAMES.has(key)) return "spread";
  return null;
}

export function polarityForName(name: string, body = ""): StatusPolarity {
  return namedStatusPolarity(name) ?? polarityFromBody(body);
}
