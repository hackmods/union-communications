import { describe, expect, it } from "vitest";
import {
  canAccessMinutesModule,
  canApproveMinutes,
  canDeleteMinutes,
  canViewMinutes,
  canWriteMinutes,
} from "./access";
import type { MeetingMinutes } from "@/types/minutes";

const sample: MeetingMinutes = {
  id: "minutes-test",
  unionId: "union-a",
  localId: "local-1",
  meetingDate: "2026-07-01T12:00:00.000Z",
  meetingType: "exec",
  attendees: ["A"],
  motions: [],
  notes: "",
  recordedById: "user-steward",
  recordedByName: "Steward",
  status: "draft",
  createdAt: "2026-07-01T12:00:00.000Z",
  updatedAt: "2026-07-01T12:00:00.000Z",
};

describe("minutes access", () => {
  it("allows elevated, president, and steward writers", () => {
    expect(canWriteMinutes(["local_steward"])).toBe(true);
    expect(canWriteMinutes(["local_president"])).toBe(true);
    expect(canWriteMinutes(["union_admin"])).toBe(true);
    expect(canApproveMinutes(["local_steward"])).toBe(true);
    expect(canAccessMinutesModule(["local_exec"])).toBe(true);
    expect(canAccessMinutesModule(["stability_member"])).toBe(false);
  });

  it("scopes view by union and local for stewards", () => {
    expect(
      canViewMinutes(sample, "union-a", "local-1", ["local_steward"]),
    ).toBe(true);
    expect(
      canViewMinutes(sample, "union-a", "local-2", ["local_steward"]),
    ).toBe(false);
    expect(
      canViewMinutes(sample, "union-b", "local-1", ["local_steward"]),
    ).toBe(false);
    expect(
      canViewMinutes(sample, "union-a", "local-2", ["union_admin"]),
    ).toBe(true);
  });

  it("restricts delete of approved minutes to elevated roles", () => {
    const approved = { ...sample, status: "approved" as const };
    expect(canDeleteMinutes(sample, "user-steward", ["local_steward"])).toBe(
      true,
    );
    expect(canDeleteMinutes(sample, "other", ["local_steward"])).toBe(false);
    expect(canDeleteMinutes(approved, "user-steward", ["local_steward"])).toBe(
      false,
    );
    expect(canDeleteMinutes(approved, "other", ["local_president"])).toBe(true);
  });
});
