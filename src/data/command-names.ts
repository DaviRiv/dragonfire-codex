/**
 * In-game Active Command titles. Dragonfire-Hub often says "Command"
 * in kit text — these names come from Star Progression cards
 * (yellow crown, "Name gains:").
 */
export const COMMAND_NAMES: Record<string, string> = {
  kalspire: "Tactical Strike",
  syrax: "Blazing Fury",
  seasmoke: "Cleansing Wrath",
  crimson: "Bloodscale Terror",
  sheepstealer: "Wild Hunt",
  shadowsong: "Breath of Fire",
  tairax: "Burning Ward",
  velar: "Whirlwind",
  feskar: "Calculated Assault",
  antares: "Relentless Pursuit",
  dawnseeker: "Radiant Wings",
  jagadrix: "Cunning Whispers",
  bevlorin: "Nature's Reckoning",
  shimmer: "Unbreakable Loyalty",
  shadowrend: "Eclipse Fervor",
  solstryker: "Tactical Onslaught",
  thunderstrike: "Tail Whip",
};

export function commandDisplayName(dragonId: string): string | undefined {
  return COMMAND_NAMES[dragonId];
}

export function commandHeading(dragonId: string): string {
  const name = commandDisplayName(dragonId);
  return name ? `Command · ${name}` : "Command";
}
