import { describe, expect, it } from "vitest";
import {
  canAccessCheckinsModule,
  canAnswerCheckin,
  canManageCheckins,
  canViewCheckinSchedule,
} from "@/lib/checkins/access";
import type { CheckinSchedule } from "@/types/checkins";
import type { UserRole } from "@/types/tenant";

const sample: CheckinSchedule = {
  id: "c1",
  unionId: "union-a",
  localId: "local-1",
  question: "What are you working on?",
  cadence: "weekly",
  weekday: 1,
  active: true,
  createdById: "pres-1",
  createdByName: "President",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("checkins access", () => {
  it("hub roles can access; stewards cannot manage", () => {
    expect(canAccessCheckinsModule(["local_steward"])).toBe(true);
    expect(canManageCheckins(["local_steward"])).toBe(false);
    expect(canManageCheckins(["local_president"])).toBe(true);
    expect(canManageCheckins(["local_exec"])).toBe(true);
  });

  it("scopes view by union/local; solo only sees own schedules", () => {
    expect(
      canViewCheckinSchedule(
        sample,
        "steward-1",
        "union-a",
        "local-1",
        ["local_steward"],
      ),
    ).toBe(true);

    expect(
      canViewCheckinSchedule(
        sample,
        "steward-1",
        "union-a",
        "local-other",
        ["local_steward"],
      ),
    ).toBe(false);

    const solo: UserRole[] = ["solo_account"];
    expect(
      canViewCheckinSchedule(sample, "pres-1", "union-a", "local-1", solo),
    ).toBe(true);
    expect(
      canViewCheckinSchedule(sample, "other", "union-a", "local-1", solo),
    ).toBe(false);
  });

  it("answer permission matches view", () => {
    expect(
      canAnswerCheckin(
        sample,
        "steward-1",
        "union-a",
        "local-1",
        ["local_steward"],
      ),
    ).toBe(true);
  });
});
