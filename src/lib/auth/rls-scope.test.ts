import { describe, expect, it } from "vitest";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import type { Session } from "next-auth";

function sessionFor(overrides: {
  unionId?: string;
  localId?: string;
  roles?: string[];
}): Session {
  return {
    user: {
      id: "user-1",
      name: "Test",
      unionId: overrides.unionId,
      localId: overrides.localId,
      roles: overrides.roles ?? [],
    },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as Session;
}

describe("rlsContextForSession", () => {
  it("returns undefined when there is no union scope", async () => {
    expect(await rlsContextForSession(sessionFor({ localId: "local-7" }))).toBeUndefined();
  });

  it("maps union + local + user scope for a steward (not cross-local)", async () => {
    expect(
      await rlsContextForSession(
        sessionFor({ unionId: "union-b7p", localId: "local-7", roles: ["local_steward"] }),
      ),
    ).toEqual({ unionId: "union-b7p", localId: "local-7", userId: "user-1", crossLocal: false, mfaVerified: false });
  });

  it("sets crossLocal for union/division/platform admins", async () => {
    for (const role of ["union_admin", "division_admin", "platform_admin"]) {
      expect(
        await rlsContextForSession(
          sessionFor({ unionId: "union-b7p", roles: [role] }),
        ),
      ).toMatchObject({ unionId: "union-b7p", crossLocal: true });
    }
  });

  it("keeps crossLocal false for local officers", async () => {
    expect(
      await rlsContextForSession(
        sessionFor({
          unionId: "union-b7p",
          localId: "local-7",
          roles: ["local_president", "local_exec"],
        }),
      ),
    ).toEqual({
      unionId: "union-b7p",
      localId: "local-7",
      userId: "user-1",
      crossLocal: false,
      mfaVerified: false,
    });
  });
});
