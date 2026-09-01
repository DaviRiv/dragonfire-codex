/** Whether the collection (or a draft rank) actually has this star gate. */
export function qualifiesForStars(
  required: number | null | undefined,
  ownedStars: number | null | undefined,
): boolean {
  if (required == null) return true;
  if (ownedStars == null) return false;
  return ownedStars >= required;
}

export function starGateHint(
  required: number,
  ownedStars: number | null | undefined,
): string {
  if (ownedStars == null) {
    return `Needs ${required}★. Not in your pit — treat this as a goal.`;
  }
  if (ownedStars >= required) return `Live at ${required}★`;
  return `Needs ${required}★. You have ${ownedStars}★.`;
}
