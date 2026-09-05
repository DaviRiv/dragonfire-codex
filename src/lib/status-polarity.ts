export type StatusPolarity = "buff" | "debuff";

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
  ].map(keyName),
);

export function keyName(value: string): string {
  return value.replace(/[’']/g, "'").trim().toLowerCase();
}

export function polarityFromBody(body: string): StatusPolarity {
  const text = body.replace(/\s+/g, " ").toLowerCase();
  if (!text.trim()) return "buff";
  if (/prevents the target from using/.test(text)) return "debuff";
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

export function polarityForName(name: string, body = ""): StatusPolarity {
  const key = keyName(name);
  if (BUFF_NAMES.has(key)) return "buff";
  if (DEBUFF_NAMES.has(key)) return "debuff";
  return polarityFromBody(body);
}
