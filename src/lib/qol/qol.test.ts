/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { buildIcsEvent, buildIcsCalendar, toIcsUtc } from "@/lib/calendar/ics";
import {
  buildHandoffPackage,
  canInitiateHandoff,
  HANDOFF_CHECKLIST,
} from "@/lib/handoff/package";
import type { Grievance } from "@/types/grievance";

describe("ICS calendar", () => {
  it("formats UTC timestamps", () => {
    expect(toIcsUtc("2026-07-10T15:30:00.000Z")).toBe("20260710T153000Z");
  });

  it("builds a valid VEVENT", () => {
    const ics = buildIcsEvent({
      uid: "test-1@local-union-hub",
      title: "Step 1 meeting; review",
      description: "Line1\nLine2",
      location: "Room A, Building 1",
      startsAt: "2026-07-15T14:00:00.000Z",
      endsAt: "2026-07-15T15:00:00.000Z",
      organizerName: "Steward",
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Step 1 meeting\\; review");
    expect(ics).toContain("DESCRIPTION:Line1\\nLine2");
    expect(ics).toContain("LOCATION:Room A\\, Building 1");
    expect(ics).toContain("DTSTART:20260715T140000Z");
    expect(ics).toContain("END:VEVENT");
  });

  it("builds a multi-event VCALENDAR", () => {
    const ics = buildIcsCalendar([
      {
        uid: "a@local",
        title: "A",
        startsAt: "2026-07-15T14:00:00.000Z",
        endsAt: "2026-07-15T15:00:00.000Z",
      },
      {
        uid: "b@local",
        title: "B",
        startsAt: "2026-07-16T14:00:00.000Z",
        endsAt: "2026-07-16T15:00:00.000Z",
      },
    ]);
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(2);
  });
});

describe("handoff package", () => {
  const sample: Grievance = {
    id: "grev-test",
    unionId: "union-opseu",
    localId: "local-243",
    category: "Discipline",
    status: "open",
    currentStep: 1,
    filedAt: "2026-01-01T00:00:00.000Z",
    assignedStewardId: "user-steward-243",
    createdById: "user-president-243",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("allows presidents to initiate handoff", () => {
    expect(canInitiateHandoff(["local_president"])).toBe(true);
    expect(canInitiateHandoff(["local_steward"])).toBe(false);
  });

  it("builds a handoff package with checklist", () => {
    const pkg = buildHandoffPackage({
      unionId: "union-opseu",
      localId: "local-243",
      fromOfficerId: "user-president-243",
      request: {
        toStewardId: "user-steward-243",
        toStewardName: "Local 243 Steward",
        grievanceIds: ["grev-test"],
        notes: "Good luck",
      },
      grievances: [sample],
    });
    expect(pkg.version).toBe("1.0");
    expect(pkg.grievanceIds).toEqual(["grev-test"]);
    expect(pkg.checklist).toEqual([...HANDOFF_CHECKLIST]);
    expect(pkg.toStewardName).toBe("Local 243 Steward");
  });
});
