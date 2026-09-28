/** Effective-date helpers for UnionOps Data reads (ISO YYYY-MM-DD). */

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function normalizeAsOf(asOf?: string | null, now = new Date()): string {
  const trimmed = String(asOf ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return todayIsoDate(now);
}

/** Inclusive start; open end when effectiveTo is blank/null. */
export function isEffectiveOn(
  effectiveFrom: string | null | undefined,
  effectiveTo: string | null | undefined,
  asOf: string,
): boolean {
  const from = String(effectiveFrom ?? "").trim();
  const to = String(effectiveTo ?? "").trim();
  if (from && from > asOf) return false;
  if (to && to <= asOf) return false;
  return true;
}

export type DatedAssertion = {
  fieldKey: string;
  value: unknown;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  observedAt: Date | string;
};

/** Latest observation that is effective on asOf, per fieldKey. */
export function pickAssertionsAsOf(
  assertions: DatedAssertion[],
  asOf: string,
): Record<string, unknown> {
  const profile: Record<string, unknown> = {};
  const ranked = [...assertions]
    .filter((row) => isEffectiveOn(row.effectiveFrom, row.effectiveTo, asOf))
    .sort((a, b) => {
      const aObs = typeof a.observedAt === "string" ? a.observedAt : a.observedAt.toISOString();
      const bObs = typeof b.observedAt === "string" ? b.observedAt : b.observedAt.toISOString();
      return bObs.localeCompare(aObs);
    });
  for (const assertion of ranked) {
    if (!(assertion.fieldKey in profile)) profile[assertion.fieldKey] = assertion.value;
  }
  return profile;
}

export type DatedInterval = {
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

export function filterEffectiveOn<T extends DatedInterval>(rows: T[], asOf: string): T[] {
  return rows.filter((row) => isEffectiveOn(row.effectiveFrom, row.effectiveTo, asOf));
}
