import type { CircleMembership } from "@/types/portal";

/** Match `@Name` tokens (spaces allowed until punctuation). */
const MENTION_RE = /@([A-Za-z0-9][A-Za-z0-9 .'-]{0,60})/g;

/**
 * Resolve @mentions against Circle roster by display name (case-insensitive).
 * Longest name match wins when several share a prefix.
 */
export function resolveMentions(
  text: string,
  roster: Array<Pick<CircleMembership, "userId" | "userName">>,
  excludeUserId?: string,
): Array<{ userId: string; userName: string }> {
  const sorted = [...roster].sort(
    (a, b) => b.userName.length - a.userName.length,
  );
  const found = new Map<string, { userId: string; userName: string }>();
  for (const match of text.matchAll(MENTION_RE)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    const hit = sorted.find((m) =>
      raw.toLowerCase().startsWith(m.userName.toLowerCase()) ||
      m.userName.toLowerCase() === raw.toLowerCase(),
    );
    if (!hit || hit.userId === excludeUserId) continue;
    found.set(hit.userId, { userId: hit.userId, userName: hit.userName });
  }
  return [...found.values()];
}
