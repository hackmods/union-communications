import type {
  EntryOtBreakdown,
  OtFlagKind,
  TimeCategory,
  TimeEntry,
  TimeOtPolicy,
} from "@/types/time";
import { entryDurationHours, isoWeekKey } from "./pay-period";

export const DEFAULT_OT_POLICY: Omit<
  TimeOtPolicy,
  "id" | "unionId" | "localId" | "name" | "createdAt" | "updatedAt"
> = {
  payPeriodType: "biweekly",
  payPeriodDays: 14,
  dailyRegularHours: 8,
  dailyOtThreshold: 8,
  weeklyRegularHours: 40,
  dailyDoubleThreshold: 12,
  otMultiplier: 1.5,
  doubleTimeMultiplier: 2,
  holidayMultiplier: 2,
  holidayDates: [],
  categoryOtEligible: { staff: true, release: true },
  active: true,
};

function utcDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function isHoliday(dateKey: string, policy: TimeOtPolicy): boolean {
  return (policy.holidayDates ?? []).includes(dateKey);
}

function countsTowardOt(
  category: TimeCategory,
  policy: TimeOtPolicy,
): boolean {
  const map = policy.categoryOtEligible ?? DEFAULT_OT_POLICY.categoryOtEligible;
  return map[category] ?? false;
}

/**
 * Full OT policy engine — daily, weekly, double-time, and holiday splits.
 * Returns per-entry hour buckets (not payroll dollars).
 */
export function applyOtPolicy(
  entries: TimeEntry[],
  policy: TimeOtPolicy,
): Map<string, EntryOtBreakdown> {
  const result = new Map<string, EntryOtBreakdown>();
  const eligible = entries
    .filter((e) => e.clockOutAt && countsTowardOt(e.category, policy))
    .sort((a, b) => a.clockInAt.localeCompare(b.clockInAt));

  const dailyRunning = new Map<string, number>();
  const weeklyRunning = new Map<string, number>();

  for (const entry of eligible) {
    const hours = entryDurationHours(entry);
    const dayKey = `${entry.workerId}::${utcDayKey(entry.clockInAt)}`;
    const weekKey = `${entry.workerId}::${isoWeekKey(entry.clockInAt)}`;
    const dayBefore = dailyRunning.get(dayKey) ?? 0;
    const weekBefore = weeklyRunning.get(weekKey) ?? 0;
    const holiday = isHoliday(utcDayKey(entry.clockInAt), policy);

    let regular = 0;
    let ot = 0;
    let double = 0;
    let holidayHours = 0;
    let flag: OtFlagKind = "none";

    if (holiday) {
      holidayHours = hours;
      flag = "holiday";
    } else {
      let remaining = hours;
      const dailyDouble = policy.dailyDoubleThreshold;
      const dailyOt = policy.dailyOtThreshold;
      const weeklyOt = policy.weeklyRegularHours;

      while (remaining > 0) {
        const slice = Math.min(remaining, 0.25);
        const dayAfter = dayBefore + regular + ot + double + slice;
        const weekAfter = weekBefore + regular + ot + double + slice;

        if (dailyDouble != null && dayAfter > dailyDouble) {
          double += slice;
          if (flag === "none") flag = "double";
        } else if (dayAfter > dailyOt || weekAfter > weeklyOt) {
          ot += slice;
          if (flag === "none") {
            flag = dayAfter > dailyOt ? "daily_ot" : "weekly_ot";
          }
        } else {
          regular += slice;
        }
        remaining -= slice;
      }
    }

    dailyRunning.set(dayKey, dayBefore + hours);
    weeklyRunning.set(weekKey, weekBefore + hours);

    result.set(entry.id, {
      entryId: entry.id,
      regularHours: Number(regular.toFixed(2)),
      otHours: Number(ot.toFixed(2)),
      doubleHours: Number(double.toFixed(2)),
      holidayHours: Number(holidayHours.toFixed(2)),
      otFlag: flag,
    });
  }

  for (const entry of entries) {
    if (!result.has(entry.id)) {
      result.set(entry.id, {
        entryId: entry.id,
        regularHours: entry.clockOutAt ? entryDurationHours(entry) : 0,
        otHours: 0,
        doubleHours: 0,
        holidayHours: 0,
        otFlag: "none",
      });
    }
  }

  return result;
}

/** Resolve active OT policy or synthesize defaults for export. */
export function resolveOtPolicy(
  policies: TimeOtPolicy[],
): TimeOtPolicy | null {
  return policies.find((p) => p.active) ?? null;
}
