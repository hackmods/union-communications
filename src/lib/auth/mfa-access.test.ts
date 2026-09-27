import { describe, expect, it } from "vitest";
import type { Session } from "next-auth";
import type { AuthorizationActor } from "@/lib/authorization/model";
import { sessionHasMfaForActor } from "@/lib/auth/mfa-access";

const HOSTED = {
  NODE_ENV: "production",
  UNIONOPS_HOSTED_CUSTOMER_MODE: "true",
  AUTH_MFA_MODE: "totp",
};

function makeActor(
  overrides: Partial<AuthorizationActor> = {},
): AuthorizationActor {
  return {
    userId: "user-1",
    roles: ["local_member"],
    memberships: [],
    assignments: [],
    delegations: [],
    circleMemberships: [],
    mfaVerified: false,
    accountActive: true,
    source: "database",
    ...overrides,
  };
}

function makeSession(input: {
  roles?: string[];
  mfaRequired?: boolean;
  mfaVerified?: boolean;
} = {}): Session {
  return {
    expires: "2030-01-01T00:00:00.000Z",
    user: {
      id: "user-1",
      roles: input.roles ?? ["local_member"],
      mfaRequired: input.mfaRequired ?? false,
      mfaVerified: input.mfaVerified ?? false,
    },
  } as Session;
}

describe("sessionHasMfaForActor", () => {
  it("preserves the MFA-off behavior outside hosted customer mode", () => {
    expect(
      sessionHasMfaForActor(
        makeSession({ roles: ["local_steward"] }),
        makeActor({ roles: ["local_steward"] }),
        { NODE_ENV: "production", AUTH_MFA_ENABLED: "false" },
      ),
    ).toBe(true);
  });

  it("allows a basic local member without forced enrollment", () => {
    expect(
      sessionHasMfaForActor(
        makeSession(),
        makeActor(),
        HOSTED,
      ),
    ).toBe(true);
  });

  it("blocks a privileged role until both session and current actor verify MFA", () => {
    const actor = makeActor({ roles: ["local_steward"] });
    expect(sessionHasMfaForActor(makeSession({ roles: ["local_steward"] }), actor, HOSTED)).toBe(false);
    expect(
      sessionHasMfaForActor(
        makeSession({ roles: ["local_steward"], mfaRequired: true, mfaVerified: true }),
        { ...actor, mfaVerified: false },
        HOSTED,
      ),
    ).toBe(false);
    expect(
      sessionHasMfaForActor(
        makeSession({ roles: ["local_steward"], mfaRequired: true, mfaVerified: true }),
        { ...actor, mfaVerified: true },
        HOSTED,
      ),
    ).toBe(true);
  });

  it("blocks a member whose current circle or delegated authority is privileged", () => {
    const session = makeSession();
    expect(
      sessionHasMfaForActor(
        session,
        makeActor({
          circleMemberships: [{ circleId: "circle-1", role: "admin" }],
        }),
        HOSTED,
      ),
    ).toBe(false);
    expect(
      sessionHasMfaForActor(
        session,
        makeActor({
          delegations: [{
            unionId: "union-1",
            localId: "local-1",
            capability: "circles.admin",
            grantorUserId: "user-2",
            endsAt: "2030-01-01T00:00:00.000Z",
          }],
        }),
        HOSTED,
      ),
    ).toBe(false);
    expect(sessionHasMfaForActor(session, makeActor(), HOSTED, true)).toBe(false);
    expect(
      sessionHasMfaForActor(
        makeSession({ mfaVerified: true }),
        makeActor({ mfaVerified: true }),
        HOSTED,
        true,
      ),
    ).toBe(true);
  });
});
