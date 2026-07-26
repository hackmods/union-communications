import { beforeEach, describe, expect, it } from "vitest";
import { runAccrualPolicies } from "@/lib/time/accrual-formulas";
import { applyOtPolicy } from "@/lib/time/ot-policy";
import {
  buildPayrollExportRows,
  payrollRowsToCsv,
} from "@/lib/time/payroll-hooks";
import { expandSeriesOccurrenceDates } from "@/lib/time/shift-recurrence";
import { memoryTimeStore } from "@/lib/time/memory-adapter";
import { resetTimeStore } from "@/lib/time/store";
import type { TimeEntry, TimeOtPolicy } from "@/types/time";

const basePolicy: TimeOtPolicy = {
  id: "pol-1",
  unionId: "union-opseu",
  localId: "local-243",
  name: "Standard",
  payPeriodType: "biweekly",
  payPeriodDays: 14,
  dailyRegularHours: 8,
  dailyOtThreshold: 8,
  weeklyRegularHours: 40,
  dailyDoubleThreshold: 12,
  otMultiplier: 1.5,
  doubleTimeMultiplier: 2,
  holidayMultiplier: 2,
  holidayDates: ["2030-07-01"],
  categoryOtEligible: { staff: true },
  active: true,
  createdAt: "2030-01-01T00:00:00.000Z",
  updatedAt: "2030-01-01T00:00:00.000Z",
};

function entry(
  id: string,
  workerId: string,
  clockInAt: string,
  hours: number,
): TimeEntry {
  const start = new Date(clockInAt);
  const end = new Date(start.getTime() + hours * 3_600_000);
  return {
    id,
    unionId: "union-opseu",
    localId: "local-243",
    workerId,
    workerName: "Worker",
    category: "staff",
    jobCodeId: "code-staff-office",
    jobCodeLabel: "Office",
    status: "approved",
    entrySource: "manual_range",
    clockInAt: start.toISOString(),
    clockOutAt: end.toISOString(),
    createdAt: start.toISOString(),
    updatedAt: end.toISOString(),
  };
}

describe("Time Phase 8 full — OT policy engine", () => {
  it("flags weekly OT after 40 hours", () => {
    const entries = [
      entry("e1", "w1", "2030-06-03T09:00:00.000Z", 10),
      entry("e2", "w1", "2030-06-04T09:00:00.000Z", 10),
      entry("e3", "w1", "2030-06-05T09:00:00.000Z", 10),
      entry("e4", "w1", "2030-06-06T09:00:00.000Z", 10),
      entry("e5", "w1", "2030-06-07T09:00:00.000Z", 5),
    ];
    const breakdown = applyOtPolicy(entries, basePolicy);
    const totalOt = [...breakdown.values()].reduce(
      (sum, row) => sum + row.otHours,
      0,
    );
    expect(totalOt).toBeGreaterThan(0);
  });

  it("treats holiday dates separately", () => {
    const entries = [entry("h1", "w1", "2030-07-01T09:00:00.000Z", 8)];
    const breakdown = applyOtPolicy(entries, basePolicy);
    expect(breakdown.get("h1")?.holidayHours).toBe(8);
  });
});

describe("Time Phase 8 full — shift recurrence", () => {
  it("expands weekday series dates", () => {
    const dates = expandSeriesOccurrenceDates(
      {
        startTime: "09:00",
        durationMinutes: 480,
        recurrence: {
          frequency: "weekly",
          weekdays: [1, 3, 5],
          startsOn: "2030-06-03",
        },
      },
      "2030-06-01",
      "2030-06-30",
    );
    expect(dates.length).toBeGreaterThan(0);
    expect(dates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true);
  });
});

describe("Time Phase 8 full — memory adapter", () => {
  beforeEach(() => {
    resetTimeStore();
  });

  it("creates worker groups and OT policies", async () => {
    const group = await memoryTimeStore.upsertWorkerGroup(
      { name: "Board", memberWorkerIds: ["tw-president-243"] },
      { unionId: "union-opseu", localId: "local-243" },
    );
    expect(group.name).toBe("Board");

    const policy = await memoryTimeStore.upsertOtPolicy(
      { name: "Local OT", weeklyRegularHours: 44 },
      { unionId: "union-opseu", localId: "local-243" },
    );
    expect(policy.weeklyRegularHours).toBe(44);
  });

  it("expands shift series into shifts", async () => {
    const series = await memoryTimeStore.createShiftSeries(
      {
        label: "Desk week",
        startTime: "09:00",
        durationMinutes: 480,
        category: "staff",
        assignedWorkerIds: ["tw-president-243"],
        recurrence: {
          frequency: "weekly",
          weekdays: [1],
          startsOn: "2030-09-01",
        },
        status: "published",
      },
      {
        unionId: "union-opseu",
        localId: "local-243",
        createdById: "user-president-243",
      },
    );

    const created = await memoryTimeStore.expandShiftSeries(
      series.id,
      "2030-09-01T00:00:00.000Z",
      "2030-09-30T23:59:59.000Z",
      {
        unionId: "union-opseu",
        localId: "local-243",
        createdById: "user-president-243",
      },
    );
    expect(created.length).toBeGreaterThan(0);
    expect(created[0]?.seriesId).toBe(series.id);
  });

  it("runs accrual policies against approved entries", async () => {
    await memoryTimeStore.upsertAccrualPolicy(
      {
        name: "Vacation accrual",
        ptoType: "vacation",
        formulaType: "hours_worked",
        hoursWorkedRate: 0.05,
        eligibleCategories: ["staff"],
      },
      { unionId: "union-opseu", localId: "local-243" },
    );
    const workers = await memoryTimeStore.listWorkers({
      unionId: "union-opseu",
      localId: "local-243",
    });
    const policies = await memoryTimeStore.listAccrualPolicies(
      "union-opseu",
      "local-243",
    );
    const results = runAccrualPolicies({
      policies,
      workers,
      entries: [],
      from: "2030-01-01T00:00:00.000Z",
      to: "2030-01-31T23:59:59.000Z",
      currentBalances: new Map(),
    });
    expect(results).toEqual([]);
  });
});

describe("Time Phase 8 full — payroll hooks", () => {
  it("maps rows to vendor CSV columns", () => {
    const rows = buildPayrollExportRows({
      profile: {
        id: "p1",
        unionId: "u",
        localId: "l",
        name: "ADP",
        vendor: "adp_workforce",
        fieldMapping: {},
        includeOtBreakdown: false,
        active: true,
        createdAt: "2030-01-01T00:00:00.000Z",
        updatedAt: "2030-01-01T00:00:00.000Z",
      },
      entries: [entry("e1", "w1", "2030-06-02T09:00:00.000Z", 8)],
      workers: [
        {
          id: "w1",
          unionId: "u",
          localId: "l",
          displayName: "Worker",
          employeeNumber: "E100",
          trackGaps: false,
          active: true,
        },
      ],
    });
    expect(rows[0]?.["Associate ID"]).toBe("E100");
    const csv = payrollRowsToCsv(rows);
    expect(csv).toContain("Associate ID");
  });
});
