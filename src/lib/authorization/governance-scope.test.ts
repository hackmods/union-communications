import { describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import type { UserRole } from "@/types/tenant";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { bylawsListScope, bylawsScopedForSession } from "@/lib/auth/bylaws-session";
import { proposalScopedForSession, proposalsListScope } from "@/lib/auth/proposals-session";

function session(roles: UserRole[] = ["local_president"], localId?: string): Session {
  return {
    user: {
      id: "actor-1",
      unionId: "union-1",
      localId,
      roles,
    },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
}

describe("Hub governance scope requires an active local or cross-local capability", () => {
  const bylaw = { unionId: "union-1", localId: "local-2" } as never;
  const proposal = { unionId: "union-1", localId: "local-2" } as never;

  it("denies local officers with no active local in list and direct-ID scope", () => {
    const actor = session();
    expect(bylawsListScope(actor).localId).toBe("__no_local_context__");
    expect(proposalsListScope(actor).localId).toBe("__no_local_context__");
    expect(bylawsScopedForSession(actor, bylaw)).toBe(false);
    expect(proposalScopedForSession(actor, proposal)).toBe(false);
  });

  it("keeps an assigned local scoped and grants union-wide scope only to cross-local administrators", () => {
    const localActor = session(["local_president"], "local-2");
    expect(bylawsListScope(localActor).localId).toBe("local-2");
    expect(proposalsListScope(localActor).localId).toBe("local-2");
    expect(bylawsScopedForSession(localActor, bylaw)).toBe(true);
    expect(proposalScopedForSession(localActor, proposal)).toBe(true);

    const unionActor = session(["union_admin"]);
    expect(bylawsListScope(unionActor).localId).toBeUndefined();
    expect(proposalsListScope(unionActor).localId).toBeUndefined();
    expect(bylawsScopedForSession(unionActor, bylaw)).toBe(true);
    expect(proposalScopedForSession(unionActor, proposal)).toBe(true);
  });
});
