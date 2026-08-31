import { describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import type { UserRole } from "@/types/tenant";
import type { InformalLogEntry } from "@/types/informal-log";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import {
  assertInformalLogView,
  isInformalLogModuleEnabled,
  listFiltersForInformalLogSession,
  tenantIdsForInformalLogSession,
} from "@/lib/auth/informal-log-session";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  bargainingUnitId?: string;
  roles?: UserRole[];
}): Session {
  return {
    user: {
      id: input?.id ?? "user-1",
      unionId: input?.unionId === null ? undefined : (input?.unionId ?? "union-opseu"),
      localId: input?.localId === null ? undefined : (input?.localId ?? "local-243"),
      bargainingUnitId: input?.bargainingUnitId,
      roles: input?.roles ?? (["local_steward"] as UserRole[]),
    },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
}

const otherUnionEntry: InformalLogEntry = {
  id: "log-other",
  unionId: "union-other",
  localId: "local-243",
  topic: "Hours",
  channel: "phone",
  summary: "Other union",
  occurredAt: "2026-08-01T12:00:00.000Z",
  loggedById: "user-x",
  loggedByName: "X",
  createdAt: "2026-08-01T12:00:00.000Z",
};

describe("informal log session helpers", () => {
  it("treats a missing union or unknown tenant as module disabled", () => {
    expect(isInformalLogModuleEnabled(session({ unionId: null }))).toBe(false);
    expect(
      isInformalLogModuleEnabled(session({ unionId: "union-does-not-exist" })),
    ).toBe(false);
    expect(isInformalLogModuleEnabled(session())).toBe(true);
  });

  it("never lists another union when the session has no unionId", () => {
    expect(listFiltersForInformalLogSession(session({ unionId: null }))).toEqual({
      unionId: "__none__",
      localId: undefined,
    });
  });

  it("pins stewards to session local and collection; solo accounts list the whole union", () => {
    expect(
      listFiltersForInformalLogSession(
        session({ bargainingUnitId: "bu-243-ft" }),
      ),
    ).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
      bargainingUnitId: "bu-243-ft",
    });

    expect(
      listFiltersForInformalLogSession(
        session({ roles: ["solo_account"], localId: "local-243" }),
      ),
    ).toEqual({ unionId: "union-opseu" });
  });

  it("lets cross-local admins drop local/collection filters only when localId is empty", () => {
    expect(
      listFiltersForInformalLogSession(
        session({
          roles: ["union_admin"],
          localId: "local-243",
          bargainingUnitId: "bu-243-ft",
        }),
      ),
    ).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
      bargainingUnitId: "bu-243-ft",
    });

    expect(
      listFiltersForInformalLogSession(
        session({
          roles: ["union_admin"],
          localId: null,
          bargainingUnitId: "bu-243-ft",
        }),
      ),
    ).toEqual({
      unionId: "union-opseu",
      localId: undefined,
      bargainingUnitId: undefined,
    });
  });

  it("stamps creates from the session, with solo fallbacks when tenant ids are missing", () => {
    expect(tenantIdsForInformalLogSession(session())).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
      bargainingUnitId: undefined,
    });
    expect(
      tenantIdsForInformalLogSession(
        session({ id: "solo-1", unionId: null, localId: null }),
      ),
    ).toEqual({
      unionId: "solo-union-solo-1",
      localId: "solo-local-solo-1",
      bargainingUnitId: undefined,
    });
  });

  it("refuses a view when the entry belongs to another union", () => {
    expect(assertInformalLogView(session(), otherUnionEntry)).toBe(false);
    expect(
      assertInformalLogView(
        session({ roles: ["platform_admin"] }),
        otherUnionEntry,
      ),
    ).toBe(false);
  });
});
