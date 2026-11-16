/**
 * Saved lines and war kits live only in this browser's storage — there is no
 * undo and no server copy — yet Disband and Delete used to fire on the first
 * click. Ask first. Matches the prompt the pit's Clear button already used.
 */
export function confirmDestructive(message: string): boolean {
  if (typeof window === "undefined") return false;
  return window.confirm(message);
}
