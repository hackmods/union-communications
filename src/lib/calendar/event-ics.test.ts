import { describe, expect, it } from "vitest";
import {
  buildEventIcsContent,
  resolveEventWindow,
} from "@/lib/calendar/event-ics";

describe("event-ics", () => {
  it("resolves calendar start/end ISO window", () => {
    const window = resolveEventWindow({
      calendarStart: "2026-08-12T12:00",
      calendarEnd: "2026-08-12T13:00",
    });
    expect(window).not.toBeNull();
    expect(window!.startsAt).toContain("2026-08-12");
    expect(new Date(window!.endsAt).getTime()).toBeGreaterThan(
      new Date(window!.startsAt).getTime(),
    );
  });

  it("defaults end to one hour when calendarEnd missing", () => {
    const window = resolveEventWindow({
      calendarStart: "2026-08-12T12:00:00",
    });
    expect(window).not.toBeNull();
    expect(
      new Date(window!.endsAt).getTime() - new Date(window!.startsAt).getTime(),
    ).toBe(60 * 60 * 1000);
  });

  it("returns null without a parseable calendarStart", () => {
    expect(
      resolveEventWindow({
        date: "Tuesday, August 12",
        time: "Noon",
      }),
    ).toBeNull();
  });

  it("builds ICS with title location and printed notice in description", () => {
    const ics = buildEventIcsContent(
      {
        title: "Membership meeting",
        subtitle: "All members welcome",
        date: "Tuesday, August 12",
        time: "12:00–1:00 pm",
        location: "Main cafeteria",
        contactName: "Local executive",
        calendarStart: "2026-08-12T12:00",
        calendarEnd: "2026-08-12T13:00",
      },
      { localNumber: "243", uid: "test-uid@unionops.local" },
    );
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Membership meeting");
    expect(ics).toContain("LOCATION:Main cafeteria");
    expect(ics).toContain("Printed notice:");
    expect(ics).toContain("UID:test-uid@unionops.local");
  });
});
