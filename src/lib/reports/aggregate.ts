/**
 * Pure rollup helpers for ORG-005 Hub reports.
 * No store I/O — callers pass already-scoped grievance / bumping / time rows.
 */

import type { BumpingCase } from "@/types/bumping";
import type { Grievance } from "@/types/grievance";
import type { TimeCategory, TimeEntry } from "@/types/time";

/** Categories counted as union-business hours (mirrors Time union-business report). */
export const UNION_BUSINESS_CATEGORIES: readonly TimeCategory[] = [
  "release",
  "duty_bank",
  "action",
  "volunteer",
  "staff",
] as const;

export interface CountRow {
  key: string;
  count: number;
}

export interface HoursRow {
  key: string;
  hours: number;
}

export interface GrievanceReportSlice {
  total: number;
  byStatus: CountRow[];
  byStep: CountRow[];
  byCategory: CountRow[];
}

export interface BumpingReportSlice {
  total: number;
  byStatus: CountRow[];
}

export interface TimeReportSlice {
  totalHours: number;
  entryCount: number;
  byCategory: HoursRow[];
}

export interface ReportsSummary {
  from: string;
  to: string;
  grievances: GrievanceReportSlice;
  bumping: BumpingReportSlice;
  time: TimeReportSlice;
}

/** Inclusive ISO range check (NaN dates excluded). */
export function isInInclusiveRange(
  iso: string,
  from: string,
  to: string,
): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const fromT = new Date(from).getTime();
  const toT = new Date(to).getTime();
  if (Number.isNaN(fromT) || Number.isNaN(toT)) return false;
  return t >= fromT && t <= toT;
}

export function countBy<T>(
  items: T[],
  keyFn: (item: T) => string,
): CountRow[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function entryDurationHours(entry: TimeEntry): number {
  if (!entry.clockOutAt) return 0;
  const ms =
    new Date(entry.clockOutAt).getTime() - new Date(entry.clockInAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return ms / 3_600_000;
}

export function aggregateGrievances(
  grievances: Grievance[],
  from: string,
  to: string,
): GrievanceReportSlice {
  const inRange = grievances.filter((g) =>
    isInInclusiveRange(g.filedAt, from, to),
  );
  return {
    total: inRange.length,
    byStatus: countBy(inRange, (g) => g.status),
    byStep: countBy(inRange, (g) => String(g.currentStep)),
    byCategory: countBy(inRange, (g) => g.category || "uncategorized"),
  };
}

export function aggregateBumpingCases(
  cases: BumpingCase[],
  from: string,
  to: string,
): BumpingReportSlice {
  const inRange = cases.filter((c) =>
    isInInclusiveRange(c.createdAt, from, to),
  );
  return {
    total: inRange.length,
    byStatus: countBy(inRange, (c) => c.status),
  };
}

export function aggregateUnionBusinessHours(
  entries: TimeEntry[],
  from: string,
  to: string,
): TimeReportSlice {
  const inRange = entries.filter(
    (e) =>
      UNION_BUSINESS_CATEGORIES.includes(e.category) &&
      isInInclusiveRange(e.clockInAt, from, to),
  );

  const byCategoryMap = new Map<string, number>();
  let totalHours = 0;
  for (const entry of inRange) {
    const hours = entryDurationHours(entry);
    totalHours += hours;
    byCategoryMap.set(
      entry.category,
      (byCategoryMap.get(entry.category) ?? 0) + hours,
    );
  }

  const byCategory = [...byCategoryMap.entries()]
    .map(([key, hours]) => ({
      key,
      hours: Math.round(hours * 100) / 100,
    }))
    .sort((a, b) => b.hours - a.hours || a.key.localeCompare(b.key));

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    entryCount: inRange.length,
    byCategory,
  };
}

export function buildReportsSummary(opts: {
  from: string;
  to: string;
  grievances: Grievance[];
  bumpingCases: BumpingCase[];
  timeEntries: TimeEntry[];
}): ReportsSummary {
  return {
    from: opts.from,
    to: opts.to,
    grievances: aggregateGrievances(opts.grievances, opts.from, opts.to),
    bumping: aggregateBumpingCases(opts.bumpingCases, opts.from, opts.to),
    time: aggregateUnionBusinessHours(opts.timeEntries, opts.from, opts.to),
  };
}

/** Default window: last 90 days through now (UTC). */
export function defaultReportsRange(now = new Date()): {
  from: string;
  to: string;
} {
  const to = new Date(now);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 90);
  return { from: from.toISOString(), to: to.toISOString() };
}
