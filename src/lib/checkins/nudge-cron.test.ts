import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as cronCheckinNudges } from "@/app/api/cron/checkin-nudges/route";
import {
  buildCheckinNudgeJobs,
  sendCheckinNudgeJobs,
} from "@/lib/checkins/nudge-cron";
import {
  resetCheckinNudgeSendsMemoryForTests,
} from "@/lib/checkins/nudge-sends";
import {
  resetCheckinsMemoryForTests,
} from "@/lib/checkins/memory-adapter";
import { currentPeriodForSchedule } from "@/lib/checkins/periods";
import type { CheckinSchedule } from "@/types/checkins";

const sendEmailMock = vi.fn();

vi.mock("@/lib/email/send", () => ({
  sendTransactionalEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

describe("checkin nudge cron", () => {
  const previousSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    resetCheckinsMemoryForTests();
    resetCheckinNudgeSendsMemoryForTests();
    sendEmailMock.mockReset();
    sendEmailMock.mockResolvedValue({ ok: false, reason: "not_configured" });
  });

  afterEach(() => {
    if (previousSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previousSecret;
    }
  });

  it("skips schedules with no active period (weekdays on weekend)", async () => {
    const saturday = new Date("2026-09-26T12:00:00.000Z");
    const weekdaySchedule: CheckinSchedule = {
      id: "weekday-only",
      unionId: "union-b7p",
      localId: "local-7",
      question: "Daily?",
      cadence: "weekdays",
      active: true,
      createdById: "user-president-7",
      createdByName: "President",
      createdAt: saturday.toISOString(),
      updatedAt: saturday.toISOString(),
    };
    expect(currentPeriodForSchedule(weekdaySchedule, saturday)).toBeNull();

    const built = await buildCheckinNudgeJobs({
      origin: "http://localhost",
      now: saturday,
    });
    expect(built.skippedNoPeriod).toBeGreaterThan(0);
    const weekdayJobs = built.jobs.filter(
      (j) => j.scheduleId === "checkin-sched-002",
    );
    expect(weekdayJobs).toHaveLength(0);
  });

  it("dedupes nudges per schedule, period, and user", async () => {
    const monday = new Date("2026-09-28T12:00:00.000Z");
    const built = await buildCheckinNudgeJobs({
      origin: "http://localhost",
      now: monday,
    });
    expect(built.jobs.length).toBeGreaterThan(0);
    const firstJob = built.jobs[0]!;

    sendEmailMock.mockResolvedValue({ ok: true, messageId: "m1" });
    const firstSend = await sendCheckinNudgeJobs([firstJob]);
    expect(firstSend.sent).toBe(1);

    const rebuilt = await buildCheckinNudgeJobs({
      origin: "http://localhost",
      now: monday,
    });
    const dupes = rebuilt.jobs.filter(
      (j) =>
        j.scheduleId === firstJob.scheduleId &&
        j.periodKey === firstJob.periodKey &&
        j.userId === firstJob.userId,
    );
    expect(dupes).toHaveLength(0);
  });

  it("GET dry-run returns preview without sending when authorized", async () => {
    process.env.CRON_SECRET = "test-checkin-cron";

    const denied = await cronCheckinNudges(
      new Request("http://localhost/api/cron/checkin-nudges?dryRun=1"),
    );
    expect(denied.status).toBe(401);

    const ok = await cronCheckinNudges(
      new Request("http://localhost/api/cron/checkin-nudges?dryRun=1", {
        headers: { authorization: "Bearer test-checkin-cron" },
      }),
    );
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as {
      dryRun: boolean;
      jobs: number;
      preview?: unknown[];
    };
    expect(body.dryRun).toBe(true);
    expect(typeof body.jobs).toBe("number");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
