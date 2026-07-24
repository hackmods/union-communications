import { describe, expect, it } from "vitest";
import {
  computeNextMeeting,
  computeNextOccurrence,
} from "@/lib/meetings/recurrence";
import type { LocalMeetingSchedule } from "@/types/meetings";

const weekdayBase: Pick<
  LocalMeetingSchedule,
  | "recurrence"
  | "dayOfMonth"
  | "weekday"
  | "nthWeekOfMonth"
  | "customDates"
  | "time"
> = {
  recurrence: "monthly",
  weekday: 2, // Tuesday
  nthWeekOfMonth: 3,
  time: "19:00",
};

describe("computeNextOccurrence", () => {
  it("finds the next 3rd Tuesday after a known date", () => {
    // 2026-07-01 is a Wednesday; 3rd Tuesday of July 2026 is the 21st.
    const from = new Date(Date.UTC(2026, 6, 1, 12, 0, 0));
    const next = computeNextOccurrence(weekdayBase, from);
    expect(next?.toISOString()).toBe("2026-07-21T19:00:00.000Z");
  });

  it("skips to the following month when the occurrence already passed", () => {
    const from = new Date(Date.UTC(2026, 6, 22, 0, 0, 0));
    const next = computeNextOccurrence(weekdayBase, from);
    // August 2026 3rd Tuesday = 18th
    expect(next?.toISOString()).toBe("2026-08-18T19:00:00.000Z");
  });

  it("handles day-of-month recurrence with clamping", () => {
    const next = computeNextOccurrence(
      {
        recurrence: "monthly",
        dayOfMonth: 31,
        time: "18:30",
      },
      new Date(Date.UTC(2026, 1, 1)), // Feb 2026 → clamp to 28
    );
    expect(next?.toISOString()).toBe("2026-02-28T18:30:00.000Z");
  });

  it("returns the soonest future custom date", () => {
    const next = computeNextOccurrence(
      {
        recurrence: "custom",
        customDates: ["2026-01-01", "2026-09-15", "2026-12-01"],
        time: "12:00",
      },
      new Date(Date.UTC(2026, 5, 1)),
    );
    expect(next?.toISOString()).toBe("2026-09-15T12:00:00.000Z");
  });

  it("returns null when custom dates are all in the past", () => {
    const next = computeNextOccurrence(
      {
        recurrence: "custom",
        customDates: ["2020-01-01"],
        time: "12:00",
      },
      new Date(Date.UTC(2026, 0, 1)),
    );
    expect(next).toBeNull();
  });
});

describe("computeNextMeeting", () => {
  it("builds NextMeetingInfo with duration", () => {
    const schedule: LocalMeetingSchedule = {
      id: "s1",
      unionId: "u1",
      localId: "l1",
      recurrence: "monthly",
      weekday: 2,
      nthWeekOfMonth: 3,
      time: "19:00",
      durationMinutes: 90,
      location: "Room 12",
      timezone: "America/Toronto",
      publicBlurb: "Members welcome",
      publicSlug: "local-u1-l1",
      updatedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedById: "user-1",
    };
    const info = computeNextMeeting(
      schedule,
      new Date(Date.UTC(2026, 6, 1, 12, 0, 0)),
    );
    expect(info?.startsAt).toBe("2026-07-21T19:00:00.000Z");
    expect(info?.endsAt).toBe("2026-07-21T20:30:00.000Z");
    expect(info?.location).toBe("Room 12");
  });
});
