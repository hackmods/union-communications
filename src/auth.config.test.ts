import { afterEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";
import {
  clearMfaGrants,
  consumeMfaGrant,
  issueMfaGrant,
} from "@/lib/auth/mfa-grants";
import { applyTrustedSessionUpdate } from "@/lib/auth/session-update";

function baseToken(overrides: Partial<JWT> = {}): JWT {
  return {
    sub: "user-steward-7",
    unionId: "union-b7p",
    localId: "local-7",
    bargainingUnitId: "bu-7-ft",
    accessibleLocalIds: ["local-7"],
    roles: ["local_steward"],
    mfaVerified: false,
    ...overrides,
  };
}

afterEach(() => {
  clearMfaGrants();
  vi.useRealTimers();
});

describe("applyTrustedSessionUpdate (SEC-001 / SEC-005)", () => {
  it("accepts a valid MFA grant nonce and sets mfaVerified", () => {
    const nonce = issueMfaGrant("user-steward-7");
    const token = applyTrustedSessionUpdate(baseToken(), { mfaGrant: nonce });
    expect(token.mfaVerified).toBe(true);
  });

  it("rejects a reused MFA grant nonce", () => {
    const nonce = issueMfaGrant("user-steward-7");
    expect(consumeMfaGrant("user-steward-7", nonce)).toBe(true);
    const token = applyTrustedSessionUpdate(baseToken(), { mfaGrant: nonce });
    expect(token.mfaVerified).toBe(false);
  });

  it("rejects an expired MFA grant nonce", () => {
    const now = 1_000_000;
    vi.setSystemTime(now);
    const nonce = issueMfaGrant("user-steward-7", now);
    const token = applyTrustedSessionUpdate(
      baseToken(),
      { mfaGrant: nonce },
      now + 61_000,
    );
    expect(token.mfaVerified).toBe(false);
  });

  it("ignores client-supplied mfaVerified without a grant (SEC-001)", () => {
    const token = applyTrustedSessionUpdate(baseToken(), {
      mfaVerified: true,
    });
    expect(token.mfaVerified).toBe(false);
  });

  it("rejects local_steward switching to a local outside accessibleLocalIds", () => {
    const token = applyTrustedSessionUpdate(baseToken(), {
      localId: "local-1337",
    });
    expect(token.localId).toBe("local-7");
  });

  it("allows division_admin to switch to any localId", () => {
    const token = applyTrustedSessionUpdate(
      baseToken({
        sub: "user-division-admin",
        roles: ["division_admin"],
        accessibleLocalIds: ["local-7", "local-1337"],
      }),
      { localId: "local-1337", bargainingUnitId: undefined },
    );
    expect(token.localId).toBe("local-1337");
  });

  it("allows union_admin to clear localId (all locals)", () => {
    const token = applyTrustedSessionUpdate(
      baseToken({
        roles: ["union_admin"],
        accessibleLocalIds: ["local-7"],
      }),
      { localId: undefined },
    );
    expect(token.localId).toBeUndefined();
  });

  it("rejects bargainingUnitId that does not belong to the active local", () => {
    const token = applyTrustedSessionUpdate(baseToken(), {
      localId: "local-7",
      bargainingUnitId: "bu-not-real",
    });
    expect(token.bargainingUnitId).toBeUndefined();
  });

  it("accepts a bargainingUnitId that belongs to the active local", () => {
    const token = applyTrustedSessionUpdate(baseToken(), {
      localId: "local-7",
      bargainingUnitId: "bu-7-pt",
    });
    expect(token.bargainingUnitId).toBe("bu-7-pt");
  });
});
