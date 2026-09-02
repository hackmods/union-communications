import { describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import type { UserRole } from "@/types/tenant";
import type { OfficerRosterEntry } from "@/types/officer-roster";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import {
  assertOfficerRosterView,
  listFiltersForOfficerRosterSession,
  tenantIdsForOfficerRosterSession,
} from "@/lib/auth/officers-session";

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

const otherUnionEntry: OfficerRosterEntry = {
  id: "off-other",
  unionId: "union-other",
  localId: "local-243",
  name: "Other union",
  role: "President",
  termStart: "2026-01-01",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("officer roster session helpers", () => {
  it("never lists another union when the session has no unionId", () => {
    expect(listFiltersForOfficerRosterSession(session({ unionId: null }))).toEqual({
      unionId: "__none__",
      localId: undefined,
    });
  });

  it("pins presidents to the session local; solo whole-union listing is not a roster path", () => {
    expect(listFiltersForOfficerRosterSession(session())).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
    });
  });

  it("lets cross-local admins drop the local filter only when localId is empty", () => {
    expect(
      listFiltersForOfficerRosterSession(
        session({ roles: ["union_admin"], localId: "local-243" }),
      ),
    ).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
    });

    expect(
      listFiltersForOfficerRosterSession(
        session({ roles: ["union_admin"], localId: null }),
      ),
    ).toEqual({
      unionId: "union-opseu",
      localId: undefined,
    });
  });

  it("stamps creates from the session, with solo fallbacks when tenant ids are missing", () => {
    expect(tenantIdsForOfficerRosterSession(session())).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
    });
    expect(
      tenantIdsForOfficerRosterSession(
        session({ id: "solo-1", unionId: null, localId: null }),
      ),
    ).toEqual({
      unionId: "solo-union-solo-1",
      localId: "solo-local-solo-1",
    });
  });

  it("refuses a view when the entry belongs to another union, including platform_admin", () => {
    expect(assertOfficerRosterView(session(), otherUnionEntry)).toBe(false);
    expect(
      assertOfficerRosterView(session({ roles: ["platform_admin"] }), otherUnionEntry),
    ).toBe(false);
  });
});
