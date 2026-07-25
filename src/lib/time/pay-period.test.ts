import { describe, expect, it } from "vitest";
import {
  entryDurationHours,
  isoWeekKey,
  payPeriodBounds,
  weeklyOtFlags,
} from "@/lib/time/pay-period";
import type { TimeEntry } from "@/types/time";

function entry(
  partial: Partial<TimeEntry> & Pick<TimeEntry, "id" | "workerId" | "clockInAt" | "clockOutAt">,
): TimeEntry {
  return {
    unionId: "u",
    localId: "l",
    workerName: "W",
    category: "staff",
    jobCodeId: "j",
    jobCodeLabel: "Office",
    status: "completed",
    entrySource: "manual_range",
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("pay-period 8d-lite", () => {
  it("computes duration hours", () => {
    expect(
      entryDurationHours(
        entry({
          id: "1",
          workerId: "w",
          clockInAt: "2030-01-06T09:00:00.000Z",
          clockOutAt: "2030-01-06T17:00:00.000Z",
        }),
      ),
    ).toBe(8);
  });

  it("flags weekly OT after 40 hours", () => {
    const rows = [
      entry({
        id: "a",
        workerId: "w",
        clockInAt: "2030-01-07T09:00:00.000Z",
        clockOutAt: "2030-01-07T17:00:00.000Z",
      }),
      entry({
        id: "b",
        workerId: "w",
        clockInAt: "2030-01-08T09:00:00.000Z",
        clockOutAt: "2030-01-08T17:00:00.000Z",
      }),
      entry({
        id: "c",
        workerId: "w",
        clockInAt: "2030-01-09T09:00:00.000Z",
        clockOutAt: "2030-01-09T17:00:00.000Z",
      }),
      entry({
        id: "d",
        workerId: "w",
        clockInAt: "2030-01-10T09:00:00.000Z",
        clockOutAt: "2030-01-10T17:00:00.000Z",
      }),
      entry({
        id: "e",
        workerId: "w",
        clockInAt: "2030-01-11T09:00:00.000Z",
        clockOutAt: "2030-01-11T17:00:00.000Z",
      }),
      entry({
        id: "f",
        workerId: "w",
        clockInAt: "2030-01-12T09:00:00.000Z",
        clockOutAt: "2030-01-12T13:00:00.000Z",
      }),
    ];
    // Mon–Fri 8h = 40; Sat 4h crosses OT
    expect(isoWeekKey("2030-01-07T09:00:00.000Z")).toBe(
      isoWeekKey("2030-01-12T09:00:00.000Z"),
    );
    const flags = weeklyOtFlags(rows, 40);
    expect(flags.get("e")).toBe(false);
    expect(flags.get("f")).toBe(true);
  });

  it("snaps pay period bounds", () => {
    const { from, to } = payPeriodBounds(
      new Date("2030-01-14T12:00:00.000Z"),
      14,
    );
    expect(from.startsWith("2030-01-01")).toBe(true);
    expect(to.startsWith("2030-01-14")).toBe(true);
  });
});
