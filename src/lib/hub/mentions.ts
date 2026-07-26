import type { MentionableUser } from "@/types/hub-social";

const MENTION_ID_PATTERN = /@\[([a-zA-Z0-9_-]+)\]/g;

/** Extract mentioned user ids from post/task text (@[id] or @Display Name). */
export function extractMentionedUserIds(
  body: string,
  roster: MentionableUser[],
): string[] {
  const ids = new Set<string>();
  const rosterById = new Map(roster.map((user) => [user.id, user]));
  const byName = [...roster].sort((a, b) => b.name.length - a.name.length);

  for (const match of body.matchAll(MENTION_ID_PATTERN)) {
    const id = match[1];
    if (rosterById.has(id)) ids.add(id);
  }

  let index = 0;
  while ((index = body.indexOf("@", index)) !== -1) {
    if (body[index + 1] === "[") {
      index += 2;
      continue;
    }
    const rest = body.slice(index + 1);
    for (const user of byName) {
      if (!rest.toLowerCase().startsWith(user.name.toLowerCase())) continue;
      const boundary = rest[user.name.length];
      if (boundary && !/[\s.,!?;:\n]/.test(boundary)) continue;
      ids.add(user.id);
      break;
    }
    index += 1;
  }

  return [...ids];
}

export type MentionTextSegment =
  | { type: "text"; value: string }
  | { type: "mention"; value: string; userId?: string };

/** Split body into plain text and mention spans for safe rendering. */
export function segmentMentionText(
  body: string,
  roster: MentionableUser[],
): MentionTextSegment[] {
  const byName = [...roster].sort((a, b) => b.name.length - a.name.length);
  const segments: MentionTextSegment[] = [];
  let cursor = 0;

  while (cursor < body.length) {
    const at = body.indexOf("@", cursor);
    if (at === -1) {
      segments.push({ type: "text", value: body.slice(cursor) });
      break;
    }

    if (at > cursor) {
      segments.push({ type: "text", value: body.slice(cursor, at) });
    }

    if (body[at + 1] === "[") {
      const close = body.indexOf("]", at + 2);
      if (close !== -1) {
        const id = body.slice(at + 2, close);
        const user = roster.find((entry) => entry.id === id);
        segments.push({
          type: "mention",
          value: user ? `@${user.name}` : body.slice(at, close + 1),
          userId: user?.id,
        });
        cursor = close + 1;
        continue;
      }
    }

    const rest = body.slice(at + 1);
    const matched = byName.find((user) => {
      if (!rest.toLowerCase().startsWith(user.name.toLowerCase())) return false;
      const boundary = rest[user.name.length];
      return !boundary || /[\s.,!?;:\n]/.test(boundary);
    });

    if (matched) {
      segments.push({
        type: "mention",
        value: `@${matched.name}`,
        userId: matched.id,
      });
      cursor = at + 1 + matched.name.length;
      continue;
    }

    segments.push({ type: "text", value: "@" });
    cursor = at + 1;
  }

  return segments;
}
