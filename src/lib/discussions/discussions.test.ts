import { describe, expect, it } from "vitest";
import {
  canAccessDiscussionsModule,
  canCrossLocalDiscussions,
  canViewDiscussionThreadBase,
} from "@/lib/discussions/access";
import type { DiscussionThread } from "@/types/discussions";

const baseThread: DiscussionThread = {
  id: "t1",
  unionId: "union-b7p",
  localId: "local-7",
  title: "Test",
  body: "Body",
  createdById: "user-steward-7",
  createdByName: "Steward",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastPostAt: new Date().toISOString(),
  postCount: 1,
};

describe("discussions access", () => {
  it("allows hub officer roles", () => {
    expect(canAccessDiscussionsModule(["local_steward"])).toBe(true);
    expect(canAccessDiscussionsModule(["stability_member"])).toBe(true);
    expect(canAccessDiscussionsModule([])).toBe(false);
  });

  it("scopes by union and local", () => {
    expect(
      canViewDiscussionThreadBase(
        baseThread,
        "user-steward-7",
        "union-b7p",
        "local-7",
        ["local_steward"],
      ),
    ).toBe(true);

    expect(
      canViewDiscussionThreadBase(
        baseThread,
        "user-steward-7",
        "union-other",
        "local-7",
        ["local_steward"],
      ),
    ).toBe(false);

    expect(
      canViewDiscussionThreadBase(
        baseThread,
        "user-steward-7",
        "union-b7p",
        "local-1337",
        ["local_steward"],
      ),
    ).toBe(false);
  });

  it("allows cross-local admins", () => {
    expect(canCrossLocalDiscussions(["union_admin"])).toBe(true);
    expect(
      canViewDiscussionThreadBase(
        baseThread,
        "user-admin",
        "union-b7p",
        "local-1337",
        ["union_admin"],
      ),
    ).toBe(true);
  });

  it("limits solo accounts to own threads", () => {
    expect(
      canViewDiscussionThreadBase(
        baseThread,
        "user-steward-7",
        "union-b7p",
        "local-7",
        ["solo_account"],
      ),
    ).toBe(true);
    expect(
      canViewDiscussionThreadBase(
        baseThread,
        "someone-else",
        "union-b7p",
        "local-7",
        ["solo_account"],
      ),
    ).toBe(false);
  });
});
