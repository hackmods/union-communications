/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import type { BumpingCase } from "@/types/bumping";
import type { Grievance } from "@/types/grievance";
import type { TimeEntry } from "@/types/time";
import {
  aggregateBumpingCases,
  aggregateGrievances,
  aggregateUnionBusinessHours,
  buildReportsSummary,
  countBy,
  defaultReportsRange,
  entryDurationHours,
  isInInclusiveRange,
} from "./aggregate";

const FROM = "2026-01-01T00:00:00.000Z";
const TO = "2026-03-31T23:59:59.999Z";

function grievance(partial: Partial<Grievance> & Pick<Grievance, "id">): Grievance {
  return {
    unionId: "u1",
    localId: "l1",
    category: "discipline",
    status: "open",
    currentStep: 1,
    filedAt: "2026-02-01T12:00:00.000Z",
    assignedStewardId: "s1",
    createdById: "s1",
    updatedAt: "2026-02-01T12:00:00.000Z",
    ...partial,
  };
}

function bumping(
  partial: Partial<BumpingCase> & Pick<BumpingCase, "id">,
): BumpingCase {
  return {
    unionId: "u1",
    localId: "l1",
    memberRef: "M1",
    seniorityDate: "2010-01-01",
    currentPosition: "A",
    targetPosition: "B",
    scenario: "test",
    status: "open",
    incumbentPosition: {
      title: "A",
      duties: "",
      qualifications: "",
      seniorityNotes: "",
    },
    bumpingPosition: {
      title: "B",
      duties: "",
      qualifications: "",
      seniorityNotes: "",
    },
    checklist: {},
    createdById: "s1",
    createdAt: "2026-02-15T12:00:00.000Z",
    updatedAt: "2026-02-15T12:00:00.000Z",
    ...partial,
  };
}

function timeEntry(
  partial: Partial<TimeEntry> & Pick<TimeEntry, "id">,
): TimeEntry {
  return {
    unionId: "u1",
    localId: "l1",
    workerId: "w1",
    workerName: "Worker",
    category: "release",
    jobCodeId: "jc1",
    jobCodeLabel: "Union business",
    status: "completed",
    entrySource: "manual_range",
    clockInAt: "2026-02-10T09:00:00.000Z",
    clockOutAt: "2026-02-10T13:00:00.000Z",
    createdAt: "2026-02-10T09:00:00.000Z",
    updatedAt: "2026-02-10T13:00:00.000Z",
    ...partial,
  };
}

describe("isInInclusiveRange", () => {
  it("includes endpoints", () => {
    expect(isInInclusiveRange(FROM, FROM, TO)).toBe(true);
    expect(isInInclusiveRange(TO, FROM, TO)).toBe(true);
  });

  it("excludes outside and invalid", () => {
    expect(isInInclusiveRange("2025-12-31T23:59:59.000Z", FROM, TO)).toBe(
      false,
    );
    expect(isInInclusiveRange("not-a-date", FROM, TO)).toBe(false);
  });
});

describe("countBy", () => {
  it("sorts by count desc then key", () => {
    expect(countBy(["b", "a", "b", "c"], (x) => x)).toEqual([
      { key: "b", count: 2 },
      { key: "a", count: 1 },
      { key: "c", count: 1 },
    ]);
  });
});

describe("entryDurationHours", () => {
  it("returns hours for completed entries", () => {
    expect(entryDurationHours(timeEntry({ id: "t1" }))).toBe(4);
  });

  it("returns 0 without clock-out", () => {
    expect(
      entryDurationHours(timeEntry({ id: "t2", clockOutAt: undefined })),
    ).toBe(0);
  });
});

describe("aggregateGrievances", () => {
  it("counts by status, step, and category within range", () => {
    const slice = aggregateGrievances(
      [
        grievance({ id: "g1", status: "open", currentStep: 1 }),
        grievance({
          id: "g2",
          status: "resolved",
          currentStep: 1,
          category: "wages",
        }),
        grievance({
          id: "g3",
          status: "open",
          currentStep: 2,
          filedAt: "2025-01-01T00:00:00.000Z",
        }),
      ],
      FROM,
      TO,
    );
    expect(slice.total).toBe(2);
    expect(slice.byStatus).toEqual([
      { key: "open", count: 1 },
      { key: "resolved", count: 1 },
    ]);
    expect(slice.byStep).toEqual([{ key: "1", count: 2 }]);
    expect(slice.byCategory).toEqual([
      { key: "discipline", count: 1 },
      { key: "wages", count: 1 },
    ]);
  });
});

describe("aggregateBumpingCases", () => {
  it("counts by status within createdAt range", () => {
    const slice = aggregateBumpingCases(
      [
        bumping({ id: "b1", status: "open" }),
        bumping({ id: "b2", status: "decided" }),
        bumping({
          id: "b3",
          status: "closed",
          createdAt: "2024-01-01T00:00:00.000Z",
        }),
      ],
      FROM,
      TO,
    );
    expect(slice.total).toBe(2);
    expect(slice.byStatus).toEqual([
      { key: "decided", count: 1 },
      { key: "open", count: 1 },
    ]);
  });
});

describe("aggregateUnionBusinessHours", () => {
  it("sums union-business hours and skips out-of-range entries", () => {
    const slice = aggregateUnionBusinessHours(
      [
        timeEntry({ id: "t1" }),
        timeEntry({
          id: "t2",
          category: "volunteer",
          clockInAt: "2025-02-11T09:00:00.000Z",
          clockOutAt: "2025-02-11T17:00:00.000Z",
        }),
        timeEntry({
          id: "t3",
          category: "action",
          clockInAt: "2026-02-12T10:00:00.000Z",
          clockOutAt: "2026-02-12T12:00:00.000Z",
        }),
      ],
      FROM,
      TO,
    );
    expect(slice.entryCount).toBe(2);
    expect(slice.totalHours).toBe(6);
    expect(slice.byCategory).toEqual([
      { key: "release", hours: 4 },
      { key: "action", hours: 2 },
    ]);
  });
});

describe("buildReportsSummary / defaultReportsRange", () => {
  it("composes slices", () => {
    const summary = buildReportsSummary({
      from: FROM,
      to: TO,
      grievances: [grievance({ id: "g1" })],
      bumpingCases: [bumping({ id: "b1" })],
      timeEntries: [timeEntry({ id: "t1" })],
    });
    expect(summary.grievances.total).toBe(1);
    expect(summary.bumping.total).toBe(1);
    expect(summary.time.totalHours).toBe(4);
  });

  it("defaults to a 90-day window", () => {
    const { from, to } = defaultReportsRange(
      new Date("2026-07-23T12:00:00.000Z"),
    );
    expect(to).toBe("2026-07-23T12:00:00.000Z");
    expect(from).toBe("2026-04-24T12:00:00.000Z");
  });
});
