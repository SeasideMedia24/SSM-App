// The fixed set of project tags you can stack onto a project and filter by.
//
// ⚠️ STARTER SET — replace with the owner's real tag list (they're sending it).
// Editing this one array updates the picker on the project form and the board
// filter everywhere. (Later this becomes editable in Settings.)

export const PROJECT_TAGS: string[] = [
  'Brand Film',
  'Social',
  'Commercial',
  'Retainer',
  'Large Project',
  'Rush',
  'Referral',
  'Event',
  'Real Estate',
  'Nonprofit',
];

// Keep only tags that are still in the allowed set (guards against removed tags).
export function cleanTags(tags: string[] | null | undefined): string[] {
  const allowed = new Set(PROJECT_TAGS);
  return (tags ?? []).filter((t) => allowed.has(t));
}
