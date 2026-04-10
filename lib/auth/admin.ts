/**
 * Founder-only admin gating via ADMIN_USER_IDS env var.
 * Comma-separated UUIDs. Fail-closed: returns false if env var unset or empty.
 */
export function isAdmin(userId: string): boolean {
  const raw = process.env.ADMIN_USER_IDS;
  if (!raw || raw.trim() === '') return false;
  const ids = raw.split(',').map((s) => s.trim());
  return ids.includes(userId);
}
