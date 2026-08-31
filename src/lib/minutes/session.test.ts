import { describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import type { UserRole } from "@/types/tenant";
import type { MeetingMinutes } from "@/types/minutes";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import {
  assertMinutesView,
  listFiltersForMinutesSession,
  tenantIdsForMinutesSession,
} from "@/lib/auth/minutes-session";

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

const sample: MeetingMinutes = {
  id: "minutes-x",
  unionId: "union-other",
  localId: "local-1",
  meetingDate: "2026-08-01T12:00:00.000Z",
  meetingType: "exec",
  attendees: [],
  motions: [],
  notes: "",
  recordedById: "user-x",
  recordedByName: "X",
  status: "draft",
  createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt: "2026-08-01T12:00:00.000Z",
};

describe("minutes session helpers", () => {
  it("never lists another union when the session has no unionId", () => {
    expect(listFiltersForMinutesSession(session({ unionId: null }))).toEqual({
      unionId: "__none__",
      localId: undefined,
    });
  });

  it("pins stewards to session local; solo accounts list the whole union", () => {
    expect(listFiltersForMinutesSession(session())).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
    });
    expect(
      listFiltersForMinutesSession(
        session({ roles: ["solo_account"], localId: "local-243" }),
      ),
    ).toEqual({ unionId: "union-opseu" });
  });

  it("lets cross-local admins drop the local filter only when localId is empty", () => {
    expect(
      listFiltersForMinutesSession(
        session({ roles: ["union_admin"], localId: "local-243" }),
      ),
    ).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
    });
    expect(
      listFiltersForMinutesSession(
        session({ roles: ["union_admin"], localId: null }),
      ),
    ).toEqual({
      unionId: "union-opseu",
      localId: undefined,
    });
  });

  it("stamps creates from the session, with solo fallbacks when tenant ids are missing", () => {
    expect(tenantIdsForMinutesSession(session())).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
    });
    expect(
      tenantIdsForMinutesSession(
        session({ id: "solo-1", unionId: null, localId: null }),
      ),
    ).toEqual({
      unionId: "solo-union-solo-1",
      localId: "solo-local-solo-1",
    });
  });

  it("refuses a view when the minutes belong to another union, including platform_admin", () => {
    expect(assertMinutesView(session(), sample)).toBe(false);
    expect(assertMinutesView(session({ roles: ["platform_admin"] }), sample)).toBe(
      false,
    );
  });
});
