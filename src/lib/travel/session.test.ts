import { describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import type { UserRole } from "@/types/tenant";
import type { TravelAuthorization } from "@/types/travel";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import {
  assertTravelView,
  listFiltersForTravelSession,
  tenantIdsForTravelSession,
} from "@/lib/auth/travel-session";

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
      roles: input?.roles ?? (["local_steward"] as UserRole[]),
    },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
}

const otherUnionAuth: TravelAuthorization = {
  id: "ta-other",
  unionId: "union-other",
  localId: "local-243",
  requestedById: "user-x",
  requestedByName: "X",
  purpose: "Convention",
  eventName: "Annual",
  eventStartDate: "2026-09-01",
  eventEndDate: "2026-09-03",
  estimatedCosts: {
    travel: 1,
    lodging: 1,
    meals: 1,
    registration: 1,
    other: 0,
  },
  status: "approved",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("travel session helpers", () => {
  it("never lists another union when the session has no unionId", () => {
    expect(listFiltersForTravelSession(session({ unionId: null }))).toEqual({
      unionId: "__none__",
      localId: undefined,
    });
  });

  it("pins stewards to session local; solo accounts list the whole union", () => {
    expect(listFiltersForTravelSession(session())).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
    });
    expect(
      listFiltersForTravelSession(
        session({ roles: ["solo_account"], localId: "local-243" }),
      ),
    ).toEqual({ unionId: "union-opseu" });
  });

  it("lets cross-local admins drop the local filter only when localId is empty", () => {
    expect(
      listFiltersForTravelSession(
        session({ roles: ["union_admin"], localId: "local-243" }),
      ),
    ).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
    });
    expect(
      listFiltersForTravelSession(
        session({ roles: ["union_admin"], localId: null }),
      ),
    ).toEqual({
      unionId: "union-opseu",
      localId: undefined,
    });
  });

  it("stamps creates from the session, with solo fallbacks when tenant ids are missing", () => {
    expect(tenantIdsForTravelSession(session())).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
    });
    expect(
      tenantIdsForTravelSession(
        session({ id: "solo-1", unionId: null, localId: null }),
      ),
    ).toEqual({
      unionId: "solo-union-solo-1",
      localId: "solo-local-solo-1",
    });
  });

  it("refuses a view when the authorization belongs to another union, including platform_admin", () => {
    expect(assertTravelView(session(), otherUnionAuth)).toBe(false);
    expect(
      assertTravelView(session({ roles: ["platform_admin"] }), otherUnionAuth),
    ).toBe(false);
  });
});
