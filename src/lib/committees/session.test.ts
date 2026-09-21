import { describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import type { UserRole } from "@/types/tenant";
import type { Committee } from "@/types/committees";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import {
  assertCommitteeView,
  listFiltersForCommitteesSession,
  tenantIdsForCommitteesSession,
} from "@/lib/auth/committees-session";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
}): Session {
  return {
    user: {
      id: input?.id ?? "user-1",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-b7p"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-7"),
      roles: input?.roles ?? (["local_president"] as UserRole[]),
    },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
}

const otherUnionCommittee: Committee = {
  id: "com-other",
  unionId: "union-other",
  localId: "local-7",
  name: "Other union H&S",
  memberOfficerIds: [],
  memberUserIds: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("committees session helpers", () => {
  it("never lists another union when the session has no unionId", () => {
    expect(listFiltersForCommitteesSession(session({ unionId: null }))).toEqual({
      unionId: "__none__",
      localId: undefined,
    });
  });

  it("pins presidents to the session local", () => {
    expect(listFiltersForCommitteesSession(session())).toEqual({
      unionId: "union-b7p",
      localId: "local-7",
    });
  });

  it("lets cross-local admins drop the local filter only when localId is empty", () => {
    expect(
      listFiltersForCommitteesSession(
        session({ roles: ["union_admin"], localId: "local-7" }),
      ),
    ).toEqual({
      unionId: "union-b7p",
      localId: "local-7",
    });

    expect(
      listFiltersForCommitteesSession(
        session({ roles: ["union_admin"], localId: null }),
      ),
    ).toEqual({
      unionId: "union-b7p",
      localId: undefined,
    });
  });

  it("stamps creates from the session, with solo fallbacks when tenant ids are missing", () => {
    expect(tenantIdsForCommitteesSession(session())).toEqual({
      unionId: "union-b7p",
      localId: "local-7",
    });
    expect(
      tenantIdsForCommitteesSession(
        session({ id: "solo-1", unionId: null, localId: null }),
      ),
    ).toEqual({
      unionId: "solo-union-solo-1",
      localId: "solo-local-solo-1",
    });
  });

  it("refuses a view when the committee belongs to another union, including platform_admin", () => {
    expect(assertCommitteeView(session(), otherUnionCommittee)).toBe(false);
    expect(
      assertCommitteeView(session({ roles: ["platform_admin"] }), otherUnionCommittee),
    ).toBe(false);
  });
});
