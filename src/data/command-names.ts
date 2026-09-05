/**
 * In-game Active Command titles. Dragonfire-Hub often says "Command"
 * in kit text — these names come from Star Progression cards
 * (yellow crown, "Name gains:").
 */
export const COMMAND_NAMES: Record<string, string> = {
  kalspire: "Tactical Strike",
  syrax: "Blazing Fury",
};

export function commandDisplayName(dragonId: string): string | undefined {
  return COMMAND_NAMES[dragonId];
}

export function commandHeading(dragonId: string): string {
  const name = commandDisplayName(dragonId);
  return name ? `Command · ${name}` : "Command";
}
