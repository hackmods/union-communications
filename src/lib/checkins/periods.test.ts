import { describe, expect, it } from "vitest";
import {
  currentPeriodForCadence,
  formatUtcDateKey,
  isScheduleInActivePeriod,
} from "@/lib/checkins/periods";

describe("checkins periods", () => {
  it("formats UTC date keys", () => {
    expect(formatUtcDateKey(new Date("2026-07-26T15:00:00.000Z"))).toBe(
      "2026-07-26",
    );
  });

  it("daily uses today's UTC date", () => {
    const period = currentPeriodForCadence(
      "daily",
      undefined,
      new Date("2026-07-26T18:00:00.000Z"),
    );
    expect(period).toEqual({
      periodKey: "2026-07-26",
      periodLabel: "2026-07-26",
    });
  });

  it("weekdays returns null on weekends", () => {
    expect(
      currentPeriodForCadence(
        "weekdays",
        undefined,
        new Date("2026-07-25T12:00:00.000Z"), // Saturday
      ),
    ).toBeNull();
    expect(
      currentPeriodForCadence(
        "weekdays",
        undefined,
        new Date("2026-07-26T12:00:00.000Z"), // Sunday
      ),
    ).toBeNull();
  });

  it("weekdays uses today on weekdays", () => {
    const period = currentPeriodForCadence(
      "weekdays",
      undefined,
      new Date("2026-07-24T12:00:00.000Z"), // Friday
    );
    expect(period?.periodKey).toBe("2026-07-24");
  });

  it("weekly anchors to the most recent target weekday", () => {
    // Wednesday Jul 22 2026 — most recent Monday is Jul 20
    const period = currentPeriodForCadence(
      "weekly",
      1,
      new Date("2026-07-22T12:00:00.000Z"),
    );
    expect(period?.periodKey).toBe("2026-07-20");
    expect(period?.periodLabel).toContain("2026-07-20");
  });

  it("isScheduleInActivePeriod respects active flag", () => {
    expect(
      isScheduleInActivePeriod(
        { cadence: "daily", active: false },
        new Date("2026-07-26T12:00:00.000Z"),
      ),
    ).toBe(false);
    expect(
      isScheduleInActivePeriod(
        { cadence: "daily", active: true },
        new Date("2026-07-26T12:00:00.000Z"),
      ),
    ).toBe(true);
  });
});
