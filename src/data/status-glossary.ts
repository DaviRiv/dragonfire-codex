/**
 * In-game keyword lines from Star Progression screenshots.
 * Hub kit text often names the buff without this glossary sentence.
 */
export const STATUS_GLOSSARY: Record<string, string> = {
  "First-Strike":
    "Causes the target to act before all other combatants each round.",
  "Double-Strike":
    "Grants the target a 2nd Basic Attack each round.",
  Advantage: "Increases the target's Damage Dealt.",
  Resistance: "Reduces the target's Damage Received.",
  Overwhelm:
    "Prevents the target from using Active Commands and Habits on their turn.",
};

export function statusGlossaryName(name: string): string | undefined {
  const key = name.replace(/[’']/g, "'").trim().toLowerCase();
  return Object.keys(STATUS_GLOSSARY).find(
    (item) => item.replace(/[’']/g, "'").toLowerCase() === key,
  );
}
