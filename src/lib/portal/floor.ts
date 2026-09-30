import type { CircleMembership, FloorMessage } from "@/types/portal";

/** Members with a Floor heartbeat newer than this are counted as present. */
export const FLOOR_PRESENCE_TTL_MS = 3 * 60 * 1000;

export function floorPresentNames(
  roster: CircleMembership[],
  nowMs = Date.now(),
): string[] {
  const cutoff = nowMs - FLOOR_PRESENCE_TTL_MS;
  return roster
    .filter((m) => {
      if (!m.lastFloorSeenAt) return false;
      return Date.parse(m.lastFloorSeenAt) >= cutoff;
    })
    .map((m) => m.userName)
    .sort((a, b) => a.localeCompare(b));
}

export function activeFloorMessages(messages: FloorMessage[]): FloorMessage[] {
  const live = messages.filter((m) => !m.deletedAt);
  const parentIds = new Set(
    live.filter((m) => !m.parentId).map((m) => m.id),
  );
  return live.filter(
    (m) => !m.parentId || parentIds.has(m.parentId),
  );
}

/** Shallow threads only: parent must be top-level and in the same circle. */
export function validateFloorParent(
  messages: FloorMessage[],
  circleId: string,
  parentId: string | undefined,
): string | null {
  if (!parentId) return null;
  const parent = messages.find(
    (m) =>
      m.id === parentId &&
      m.circleId === circleId &&
      !m.deletedAt,
  );
  if (!parent) return "Parent message not found";
  if (parent.parentId) return "Replies cannot be nested";
  return null;
}
