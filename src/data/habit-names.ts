/**
 * In-game habit titles. Dragonfire-Hub only stores rank text, not these
 * names — they come from the Star Progression habit cards.
 * Index 0 is Habit 1 (2★). Unknown slots stay unset.
 */
export const HABIT_NAMES: Record<string, (string | undefined)[]> = {
  vermax: [
    "Trial by Flame",
    "Reactive Instincts",
    "Rallying Flame",
    "Dragon's Valor",
    "Unyielding Resolve",
  ],
  moondancer: [
    "New Moon",
    "Reactive Instincts",
    "Full Moon",
    "Blood Moon",
    "Eclipsing Strike",
  ],
  venator: [
    "Hunter's Bane",
    "Dragon's Might",
    "Feral Precision",
    "Armor Break",
    "Desperate Ambush",
  ],
  malachite: [
    "Forest's Instinct",
    "Wise Vigor",
    "Thunderous Roar",
    "Collective Might",
    "Lightning Strike",
  ],
  rhysarion: [
    "Ebbing Fury",
    "Sharp Resolve",
    "Echoing Melody",
    "Unbroken Devotion",
    "Inspiring Melody",
  ],
  sunfyre: [
    "Radiant Majesty",
    "Extinguish",
    "The King's Ire",
    "Unbroken Splendor",
    "Adaptive Glory",
  ],
  kalspire: [
    "Robust Insight",
    "Battle Cunning",
    "Tactical Assault",
    "Dragon's Insight",
    "Radiant Conqueror",
  ],
  caraxes: [
    "Battle Dread",
    "Dragon's Flair",
    "Crippling Inferno",
    "Mass Enfeeble",
    "Blood Wyrm",
  ],
  crimson: [
    "Enervate",
    "Dragon's Intellect",
    "Bloodscale Fury",
    "Unlikely Hero",
    "Vermin's Bane",
  ],
  syrax: [
    "Mindful Synergy",
    "Flight Mastery",
    "Strategic Revival",
    "Tactical Inferno",
    "Mother's Mercy",
  ],
  vhagar: [
    "Ancestral Shield",
    "Battle Leader",
    "Eclipse Cover",
    "Blazing Onslaught",
    "Skyward Titan",
  ],
  seasmoke: [
    "Clever Maneuver",
    "Wind's Favor",
    "Infectious Wrath",
    "Cunning Ferocity",
    "Loyal Bond",
  ],
  sheepstealer: [
    "Stolen Flock",
    "Dragon's Cunning",
    "Baited Kill",
    "Wary Beast",
    "Savage Claim",
  ],
  daemoros: [
    "Instill Fear",
    "Powerful Reflexes",
    "Shroud of Shadows",
    "Darkening Fear",
    "Phantom's Veil",
  ],
  shadowsong: [
    "Ensnare",
    "Blazing Onslaught",
    "Scorched Earth",
    "Dragon's Intellect",
    "Blazing Conductor",
  ],
  tessarion: [
    "Sharpened Beauty",
    "Blazing Leader",
    "Molten Armor",
    "Clever Maneuver",
    "The Blue Queen",
  ],
  tairax: [
    "Whisper of Ash",
    "Sunder",
    "Gleamstrike",
    "Gift of Fire",
    "Moonlit Hunt",
  ],
  velar: [
    "Strategic Leader",
    "Quick Reflexes",
    "Gales of Power",
    "Fierce Unity",
    "Breath of Renewal",
  ],
  feskar: [
    "Resilient Bond",
    "Insightful Allies",
    "Emerald Inferno",
    "Quick-Witted",
    "Unyielding Grasp",
  ],
  zivern: [
    "Battle Mastery",
    "Keen Instinct",
    "Fearsome Reach",
    "Steel Shroud",
    "Cloak of Terror",
  ],
  vaeldra: [
    "Dragon's Valor",
    "Ensnare",
    "Tempting Distraction",
    "Infernal Force",
    "Siren's Call",
  ],
  tashix: [
    "Enervate",
    "Dragon's Cunning",
    "Cunning Ruse",
    "Battle Guile",
    "Veiled Ambush",
  ],
  antares: [
    "Blazing Onslaught",
    "Dragon's Flair",
    "Fiery Precision",
    "Dragon's Intellect",
    "Redemption",
  ],
  arrax: [
    "Headlong Into Danger",
    "Stone Bulwark",
    "Adaptive Guard",
    "Fire Ward",
    "Turn the Line",
  ],
};

export function habitDisplayName(
  dragonId: string,
  habit: number | null | undefined,
): string | undefined {
  if (habit == null || habit < 1) return undefined;
  return HABIT_NAMES[dragonId]?.[habit - 1];
}
