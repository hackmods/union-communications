/** Default window for "term expiring soon" Hub banner (ORG-002). */
export const TERM_EXPIRING_SOON_DAYS = 60;

/**
 * True when `termEnd` is set and falls within the next `withinDays`
 * (inclusive of already-expired terms still on the roster).
 */
export function isTermExpiringSoon(
  termEnd: string | undefined,
  withinDays: number = TERM_EXPIRING_SOON_DAYS,
  now: Date = new Date(),
): boolean {
  if (!termEnd) return false;
  const end = new Date(termEnd);
  if (Number.isNaN(end.getTime())) return false;
  const ms = withinDays * 24 * 60 * 60 * 1000;
  const horizon = new Date(now.getTime() + ms);
  return end.getTime() <= horizon.getTime();
}

export function filterExpiringSoon<T extends { termEnd?: string }>(
  entries: T[],
  withinDays: number = TERM_EXPIRING_SOON_DAYS,
  now: Date = new Date(),
): T[] {
  return entries.filter((e) => isTermExpiringSoon(e.termEnd, withinDays, now));
}
