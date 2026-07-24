import { describe, expect, it } from "vitest";
import {
  canAccessMeetingsModule,
  canWriteMeetingSchedule,
} from "./access";

describe("meetings access", () => {
  it("allows officers to view meeting settings", () => {
    expect(canAccessMeetingsModule(["local_steward"])).toBe(true);
    expect(canAccessMeetingsModule(["local_president"])).toBe(true);
    expect(canAccessMeetingsModule([])).toBe(false);
  });

  it("restricts schedule write to president/exec/admin", () => {
    expect(canWriteMeetingSchedule(["local_steward"])).toBe(false);
    expect(canWriteMeetingSchedule(["local_president"])).toBe(true);
    expect(canWriteMeetingSchedule(["local_exec"])).toBe(true);
    expect(canWriteMeetingSchedule(["union_admin"])).toBe(true);
  });
});
