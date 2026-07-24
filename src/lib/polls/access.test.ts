import { describe, expect, it } from "vitest";
import {
  canAccessPollsModule,
  canMutatePolls,
  canViewPoll,
} from "./access";
import type { PollDefinition } from "@/types/polls";

const poll: PollDefinition = {
  id: "p1",
  slug: "test-poll",
  unionId: "u1",
  localId: "l1",
  title: "Test poll",
  status: "open",
  questions: [
    {
      id: "q1",
      text: "Attend?",
      type: "single_choice",
      options: ["Yes", "No"],
    },
  ],
  createdById: "user-1",
  consentRequired: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("polls access", () => {
  it("allows QOL managers including stewards", () => {
    expect(canAccessPollsModule(["local_president"])).toBe(true);
    expect(canAccessPollsModule(["local_steward"])).toBe(true);
    expect(canAccessPollsModule([])).toBe(false);
    expect(canMutatePolls(["local_exec"])).toBe(true);
  });

  it("scopes view by union and local", () => {
    expect(canViewPoll(poll, "u1", "l1", ["local_president"])).toBe(true);
    expect(canViewPoll(poll, "u2", "l1", ["local_president"])).toBe(false);
    expect(canViewPoll(poll, "u1", "l2", ["local_president"])).toBe(false);
    expect(canViewPoll(poll, "u1", "l2", ["union_admin"])).toBe(true);
  });
});
