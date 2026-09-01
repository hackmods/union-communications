import { describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import type { UserRole } from "@/types/tenant";
import type { ElectionCycle } from "@/types/elections";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import {
  assertElectionView,
  listFiltersForElectionsSession,
  tenantIdsForElectionsSession,
} from "@/lib/auth/elections-session";

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
        input?.unionId === null ? undefined : (input?.unionId ?? "union-opseu"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-243"),
      roles: input?.roles ?? (["local_president"] as UserRole[]),
    },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
}

const otherUnion: ElectionCycle = {
  id: "elec-other",
  unionId: "union-other",
  localId: "local-1",
  title: "Other union exec",
  positions: ["President"],
  status: "open",
  nominations: [],
  tallies: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("elections session helpers", () => {
  it("never lists another union when the session has no unionId", () => {
    expect(listFiltersForElectionsSession(session({ unionId: null }))).toEqual({
      unionId: "__none__",
      localId: undefined,
    });
  });

  it("pins presidents to session local", () => {
    expect(listFiltersForElectionsSession(session())).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
    });
  });

  it("lets cross-local admins drop the local filter only when localId is empty", () => {
    expect(
      listFiltersForElectionsSession(
        session({ roles: ["union_admin"], localId: "local-243" }),
      ),
    ).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
    });
    expect(
      listFiltersForElectionsSession(
        session({ roles: ["union_admin"], localId: null }),
      ),
    ).toEqual({
      unionId: "union-opseu",
      localId: undefined,
    });
  });

  it("stamps creates from the session, with solo fallbacks when tenant ids are missing", () => {
    expect(tenantIdsForElectionsSession(session())).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
    });
    expect(
      tenantIdsForElectionsSession(
        session({ id: "solo-1", unionId: null, localId: null }),
      ),
    ).toEqual({
      unionId: "solo-union-solo-1",
      localId: "solo-local-solo-1",
    });
  });

  it("refuses a view when the cycle belongs to another union, including platform_admin", () => {
    expect(assertElectionView(session(), otherUnion)).toBe(false);
    expect(
      assertElectionView(session({ roles: ["platform_admin"] }), otherUnion),
    ).toBe(false);
  });
});
