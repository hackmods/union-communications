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
    sub: "user-steward-243",
    unionId: "union-opseu",
    localId: "local-243",
    bargainingUnitId: "bu-243-ft",
    accessibleLocalIds: ["local-243"],
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
    const nonce = issueMfaGrant("user-steward-243");
    const token = applyTrustedSessionUpdate(baseToken(), { mfaGrant: nonce });
    expect(token.mfaVerified).toBe(true);
  });

  it("rejects a reused MFA grant nonce", () => {
    const nonce = issueMfaGrant("user-steward-243");
    expect(consumeMfaGrant("user-steward-243", nonce)).toBe(true);
    const token = applyTrustedSessionUpdate(baseToken(), { mfaGrant: nonce });
    expect(token.mfaVerified).toBe(false);
  });

  it("rejects an expired MFA grant nonce", () => {
    const now = 1_000_000;
    vi.setSystemTime(now);
    const nonce = issueMfaGrant("user-steward-243", now);
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
      localId: "local-560",
    });
    expect(token.localId).toBe("local-243");
  });

  it("allows division_admin to switch to any localId", () => {
    const token = applyTrustedSessionUpdate(
      baseToken({
        sub: "user-division-admin",
        roles: ["division_admin"],
        accessibleLocalIds: ["local-243", "local-560"],
      }),
      { localId: "local-560", bargainingUnitId: undefined },
    );
    expect(token.localId).toBe("local-560");
  });

  it("allows union_admin to clear localId (all locals)", () => {
    const token = applyTrustedSessionUpdate(
      baseToken({
        roles: ["union_admin"],
        accessibleLocalIds: ["local-243"],
      }),
      { localId: undefined },
    );
    expect(token.localId).toBeUndefined();
  });

  it("rejects bargainingUnitId that does not belong to the active local", () => {
    const token = applyTrustedSessionUpdate(baseToken(), {
      localId: "local-243",
      bargainingUnitId: "bu-not-real",
    });
    expect(token.bargainingUnitId).toBeUndefined();
  });

  it("accepts a bargainingUnitId that belongs to the active local", () => {
    const token = applyTrustedSessionUpdate(baseToken(), {
      localId: "local-243",
      bargainingUnitId: "bu-243-pt",
    });
    expect(token.bargainingUnitId).toBe("bu-243-pt");
  });
});
