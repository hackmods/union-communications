/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { buildIcsCalendar } from "@/lib/calendar/ics";
import {
  hubEventsToIcsInputs,
  sessionDateToWindow,
  type HubCalendarEvent,
} from "@/lib/calendar/hub-events";

describe("hub calendar helpers", () => {
  it("expands session date-only into a 1h UTC window", () => {
    expect(sessionDateToWindow("2026-07-20")).toEqual({
      startsAt: "2026-07-20T16:00:00.000Z",
      endsAt: "2026-07-20T17:00:00.000Z",
    });
  });

  it("maps hub events to ICS inputs with stable UIDs", () => {
    const events: HubCalendarEvent[] = [
      {
        id: "meet-1",
        kind: "grievance_meeting",
        title: "Step 1",
        startsAt: "2026-07-15T14:00:00.000Z",
        endsAt: "2026-07-15T15:00:00.000Z",
        unionId: "union-opseu",
        localId: "local-243",
        href: "/app/grievances/grev-1",
        parentId: "grev-1",
      },
    ];
    const inputs = hubEventsToIcsInputs(events);
    expect(inputs[0].uid).toBe(
      "hub-cal-grievance_meeting-meet-1@unionops.local",
    );
    expect(inputs[0].title).toBe("Step 1");
  });

  it("builds a multi-event ICS from hub events", () => {
    const events: HubCalendarEvent[] = [
      {
        id: "meet-1",
        kind: "grievance_meeting",
        title: "Meeting A",
        startsAt: "2026-07-15T14:00:00.000Z",
        endsAt: "2026-07-15T15:00:00.000Z",
        unionId: "union-opseu",
        localId: "local-243",
        href: "/app/grievances/grev-1",
        parentId: "grev-1",
      },
      {
        id: "sess-1",
        kind: "bumping_session",
        title: "Session B",
        startsAt: "2026-07-16T16:00:00.000Z",
        endsAt: "2026-07-16T17:00:00.000Z",
        unionId: "union-opseu",
        localId: "local-243",
        href: "/app/bumping/bump-1",
        parentId: "bump-1",
      },
    ];
    const ics = buildIcsCalendar(hubEventsToIcsInputs(events));
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(2);
    expect(ics).toContain("SUMMARY:Meeting A");
    expect(ics).toContain("SUMMARY:Session B");
  });
});
