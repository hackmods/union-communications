import { describe, expect, it } from "vitest";
import {
  entryDurationHours,
  rollupByCategory,
  rollupByWorker,
} from "@/lib/time/export-rollup";
import type { TimeEntry } from "@/types/time";

const sample: TimeEntry[] = [
  {
    id: "1",
    unionId: "u",
    localId: "l",
    workerId: "w1",
    workerName: "Ada",
    category: "staff",
    jobCodeId: "c1",
    jobCodeLabel: "Office",
    status: "approved",
    entrySource: "manual_range",
    clockInAt: "2026-07-01T09:00:00.000Z",
    clockOutAt: "2026-07-01T13:00:00.000Z",
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-07-01T13:00:00.000Z",
  },
  {
    id: "2",
    unionId: "u",
    localId: "l",
    workerId: "w1",
    workerName: "Ada",
    category: "release",
    jobCodeId: "c2",
    jobCodeLabel: "Griev",
    status: "approved",
    entrySource: "manual_range",
    clockInAt: "2026-07-02T09:00:00.000Z",
    clockOutAt: "2026-07-02T11:00:00.000Z",
    createdAt: "2026-07-02T09:00:00.000Z",
    updatedAt: "2026-07-02T11:00:00.000Z",
  },
  {
    id: "3",
    unionId: "u",
    localId: "l",
    workerId: "w2",
    workerName: "Bea",
    category: "staff",
    jobCodeId: "c1",
    jobCodeLabel: "Office",
    status: "approved",
    entrySource: "clock",
    clockInAt: "2026-07-01T10:00:00.000Z",
    clockOutAt: "2026-07-01T12:00:00.000Z",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
  },
];

describe("time export rollup", () => {
  it("computes duration hours", () => {
    expect(entryDurationHours(sample[0])).toBe(4);
  });

  it("rolls up by worker", () => {
    const rows = rollupByWorker(sample);
    expect(rows.find((r) => r.workerId === "w1")?.hours).toBe(6);
    expect(rows.find((r) => r.workerId === "w2")?.hours).toBe(2);
  });

  it("rolls up by category", () => {
    const rows = rollupByCategory(sample);
    expect(rows.find((r) => r.category === "staff")?.hours).toBe(6);
    expect(rows.find((r) => r.category === "release")?.hours).toBe(2);
  });
});
