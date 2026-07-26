import type {
  AccrualRunResult,
  PtoAccrualPolicy,
  TimeEntry,
  TimeWorker,
} from "@/types/time";
import { entryDurationHours } from "./pay-period";

function monthsSinceHire(hireDate: string | undefined, asOf: Date): number {
  if (!hireDate) return 0;
  const hire = new Date(`${hireDate}T00:00:00.000Z`);
  if (Number.isNaN(hire.getTime())) return 0;
  return (
    (asOf.getUTCFullYear() - hire.getUTCFullYear()) * 12 +
    (asOf.getUTCMonth() - hire.getUTCMonth())
  );
}

function eligibleHours(
  entries: TimeEntry[],
  workerId: string,
  categories: PtoAccrualPolicy["eligibleCategories"],
  from: string,
  to: string,
): number {
  const allowed = new Set(categories ?? ["staff", "release"]);
  return entries
    .filter(
      (e) =>
        e.workerId === workerId &&
        e.status === "approved" &&
        e.clockOutAt &&
        e.clockInAt >= from &&
        e.clockInAt <= to &&
        allowed.has(e.category),
    )
    .reduce((sum, e) => sum + entryDurationHours(e), 0);
}

/** Compute accrual hours for one worker under a policy for a date range. */
export function computeAccrualForWorker(
  policy: PtoAccrualPolicy,
  worker: TimeWorker,
  entries: TimeEntry[],
  from: string,
  to: string,
): number {
  const asOf = new Date(to);

  switch (policy.formulaType) {
    case "hours_worked": {
      const rate = policy.hoursWorkedRate ?? 0;
      const hours = eligibleHours(
        entries,
        worker.id,
        policy.eligibleCategories,
        from,
        to,
      );
      return Number((hours * rate).toFixed(2));
    }
    case "fixed_per_period": {
      const periodDays = policy.periodDays ?? 14;
      const rangeMs = new Date(to).getTime() - new Date(from).getTime();
      const periods = Math.max(1, Math.round(rangeMs / (periodDays * 86_400_000)));
      return Number(((policy.fixedHoursPerPeriod ?? 0) * periods).toFixed(2));
    }
    case "tenure_tier": {
      const months = monthsSinceHire(worker.hireDate, asOf);
      const tiers = [...(policy.tenureTiers ?? [])].sort(
        (a, b) => b.minMonths - a.minMonths,
      );
      const tier = tiers.find((t) => months >= t.minMonths);
      const periodDays = policy.periodDays ?? 14;
      const rangeMs = new Date(to).getTime() - new Date(from).getTime();
      const periods = Math.max(1, Math.round(rangeMs / (periodDays * 86_400_000)));
      return Number(((tier?.hoursPerPeriod ?? 0) * periods).toFixed(2));
    }
    default:
      return 0;
  }
}

/** Run all active accrual policies for workers in range. */
export function runAccrualPolicies(input: {
  policies: PtoAccrualPolicy[];
  workers: TimeWorker[];
  entries: TimeEntry[];
  from: string;
  to: string;
  currentBalances: Map<string, number>;
}): AccrualRunResult[] {
  const results: AccrualRunResult[] = [];
  const active = input.policies.filter((p) => p.active);

  for (const policy of active) {
    for (const worker of input.workers.filter((w) => w.active)) {
      const hours = computeAccrualForWorker(
        policy,
        worker,
        input.entries,
        input.from,
        input.to,
      );
      if (hours <= 0) continue;
      const balanceKey = `${worker.id}::${policy.ptoType}`;
      const before = input.currentBalances.get(balanceKey) ?? 0;
      const after = Number((before + hours).toFixed(2));
      input.currentBalances.set(balanceKey, after);
      results.push({
        policyId: policy.id,
        workerId: worker.id,
        ptoType: policy.ptoType,
        hoursAccrued: hours,
        balanceAfter: after,
      });
    }
  }

  return results;
}
