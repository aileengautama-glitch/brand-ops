/**
 * Lightweight name-matching helper for auto-linking a logged-in user to
 * their project-local member record (TeamMember / CrewMember).
 *
 * Case-insensitive, trims whitespace. No fuzzy matching — exact name only.
 * If no exact match is found the user must link manually on My Tasks.
 */
export function findMemberByName(
  userName: string,
  members: Array<{ id: string; name: string }>
): string | null {
  const needle = userName.trim().toLowerCase()
  return members.find((m) => m.name.trim().toLowerCase() === needle)?.id ?? null
}
