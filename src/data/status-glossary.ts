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
  Weakened: "Reduces the target's Damage Dealt.",
  Resistance: "Reduces the target's Damage Received.",
  Taunt:
    "Forces the target to launch their Basic Attacks against this dragon.",
  Overwhelm:
    "Prevents the target from using Active Commands and Habits on their turn.",
  Stun: "Prevents the target from using Commands and Habits, or launching Basic Attacks on their turn.",
  Panic: "Deals Tactical Damage to the target each round.",
  Burn: "Deals Fire Damage to the target each round.",
  Slow: "Causes the target to attack after all other combatants each round.",
  Control: "Includes Stun, Stagger, Overwhelm, and Confusion.",
  Evade:
    "Causes each instance of damage against the target to have a chance to be ignored.",
  Vulnerable: "Increases the target's Damage Received.",
  Prey: "Reduces the target's Recovery Received.",
  Confusion:
    "Causes the target to have a 50% chance to mistake Allies for Enemies and vice versa each time they activate a Command or Habit, or launch a Basic Attack on their turn.",
  Stagger:
    "Prevents the target from using Attack Modifier Commands or launching Basic Attacks.",
  "Nullify Recovery": "Prevents the target from receiving Recovery.",
};

export function statusGlossaryName(name: string): string | undefined {
  const key = name.replace(/[’']/g, "'").trim().toLowerCase();
  return Object.keys(STATUS_GLOSSARY).find(
    (item) => item.replace(/[’']/g, "'").toLowerCase() === key,
  );
}
