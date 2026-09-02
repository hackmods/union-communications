import { describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import type { UserRole } from "@/types/tenant";
import type { LedgerEntry } from "@/types/ledger";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import {
  assertLedgerView,
  listFiltersForLedgerSession,
  tenantIdsForLedgerSession,
} from "@/lib/auth/ledger-session";

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

const otherUnion: LedgerEntry = {
  id: "led-other",
  unionId: "union-other",
  localId: "local-243",
  date: "2026-08-01",
  description: "Must never appear",
  amount: 50,
  type: "income",
  category: "fundraising",
  recordedById: "user-x",
};

describe("ledger session helpers", () => {
  it("never lists another union when the session has no unionId", () => {
    expect(listFiltersForLedgerSession(session({ unionId: null }))).toEqual({
      unionId: "__none__",
      localId: undefined,
    });
  });

  it("pins presidents and treasurers to session local", () => {
    expect(listFiltersForLedgerSession(session())).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
    });
    expect(
      listFiltersForLedgerSession(
        session({ roles: ["local_exec"], localId: "local-243" }),
      ),
    ).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
    });
  });

  it("lets cross-local admins drop the local filter only when localId is empty", () => {
    expect(
      listFiltersForLedgerSession(
        session({ roles: ["union_admin"], localId: "local-243" }),
      ),
    ).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
    });
    expect(
      listFiltersForLedgerSession(
        session({ roles: ["union_admin"], localId: null }),
      ),
    ).toEqual({
      unionId: "union-opseu",
      localId: undefined,
    });
  });

  it("stamps creates from the session, with solo fallbacks when tenant ids are missing", () => {
    expect(tenantIdsForLedgerSession(session())).toEqual({
      unionId: "union-opseu",
      localId: "local-243",
    });
    expect(
      tenantIdsForLedgerSession(
        session({ id: "solo-1", unionId: null, localId: null }),
      ),
    ).toEqual({
      unionId: "solo-union-solo-1",
      localId: "solo-local-solo-1",
    });
  });

  it("refuses a view when the entry belongs to another union, including platform_admin", () => {
    expect(assertLedgerView(session(), otherUnion)).toBe(false);
    expect(
      assertLedgerView(session({ roles: ["platform_admin"] }), otherUnion),
    ).toBe(false);
  });
});
