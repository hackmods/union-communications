import { describe, expect, it } from "vitest";
import {
  assertCronSecret,
  buildCronDryRunPayload,
  buildOfficerReminderJobs,
  officerEmailsForLocal,
  parseCronDryRun,
  parseCronWithinDays,
  reminderWindowIso,
} from "@/lib/meetings/officer-reminder-cron";
import type { OfficerRosterEntry } from "@/types/officer-roster";
import type { UnionMeeting } from "@/types/meetings";

describe("officer reminder cron helpers", () => {
  it("dedupes officer emails", () => {
    const officers: OfficerRosterEntry[] = [
      {
        id: "1",
        unionId: "u",
        localId: "l",
        name: "A",
        role: "President",
        email: "a@example.com",
        termStart: "2026-01-01",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "2",
        unionId: "u",
        localId: "l",
        name: "A2",
        role: "VP",
        email: "A@example.com",
        termStart: "2026-01-01",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "3",
        unionId: "u",
        localId: "l",
        name: "B",
        role: "Steward",
        termStart: "2026-01-01",
        createdAt: "",
        updatedAt: "",
      },
    ];
    expect(officerEmailsForLocal(officers)).toEqual(["a@example.com"]);
  });

  it("builds one job per officer email per meeting", () => {
    const meeting: UnionMeeting = {
      id: "m1",
      unionId: "u1",
      localId: "l1",
      title: "GM",
      startsAt: "2030-01-15T19:00:00.000Z",
      endsAt: "2030-01-15T21:00:00.000Z",
      location: "Hall",
      hybrid: false,
      createdById: "x",
      createdAt: "",
      updatedAt: "",
    };
    const officersByLocal = new Map([
      [
        "u1::l1",
        [
          {
            id: "1",
            unionId: "u1",
            localId: "l1",
            name: "Pres",
            role: "President",
            email: "pres@example.com",
            termStart: "2026-01-01",
            createdAt: "",
            updatedAt: "",
          },
        ] satisfies OfficerRosterEntry[],
      ],
    ]);
    const jobs = buildOfficerReminderJobs({
      meetings: [meeting],
      officersByLocal,
      origin: "https://unionops.org",
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.to).toBe("pres@example.com");
    expect(jobs[0]?.subject).toContain("GM");
  });

  it("computes reminder window and validates cron secret", () => {
    const { fromIso, toIso } = reminderWindowIso(
      new Date("2030-01-01T00:00:00.000Z"),
      7,
    );
    expect(fromIso).toBe("2030-01-01T00:00:00.000Z");
    expect(toIso).toBe("2030-01-08T00:00:00.000Z");
    expect(assertCronSecret("Bearer secret", "secret")).toBe(true);
    expect(assertCronSecret("secret", "secret")).toBe(true);
    expect(assertCronSecret("Bearer wrong", "secret")).toBe(false);
    expect(assertCronSecret("Bearer secret", undefined)).toBe(false);
  });

  it("parses cron query params for dry run and within-days window", () => {
    expect(parseCronDryRun(new URLSearchParams("dryRun=1"))).toBe(true);
    expect(parseCronDryRun(new URLSearchParams("dryRun=true"))).toBe(true);
    expect(parseCronDryRun(new URLSearchParams("dryRun=0"))).toBe(false);
    expect(parseCronWithinDays(new URLSearchParams("days=14"))).toBe(14);
    expect(parseCronWithinDays(new URLSearchParams("days=99"))).toBe(7);
    expect(parseCronWithinDays(new URLSearchParams())).toBe(7);
  });

  it("builds dry-run preview payload without sending", () => {
    const payload = buildCronDryRunPayload({
      withinDays: 7,
      fromIso: "2030-01-01T00:00:00.000Z",
      toIso: "2030-01-08T00:00:00.000Z",
      meetings: 1,
      jobs: [
        {
          meetingId: "m1",
          unionId: "u1",
          localId: "l1",
          to: "pres@example.com",
          subject: "Reminder: GM",
          text: "body",
        },
      ],
    });
    expect(payload.dryRun).toBe(true);
    expect(payload.jobs).toBe(1);
    expect(payload.preview[0]?.to).toBe("pres@example.com");
  });
});
