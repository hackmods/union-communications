import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";
import {
  clearMfaGrants,
  consumeMfaGrant,
  issueMfaGrant,
} from "@/lib/auth/mfa-grants";
import { applyTrustedSessionUpdate } from "@/lib/auth/session-update";
import { refreshJwtTenancyIfStale } from "@/lib/auth/refresh-jwt-tenancy";

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

beforeEach(() => {
  vi.stubEnv("AUTH_USERS_BACKEND", "memory");
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("UNIONOPS_HOSTED_CUSTOMER_MODE", "");
});

afterEach(() => {
  clearMfaGrants();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("applyTrustedSessionUpdate (SEC-001 / SEC-005)", () => {
  it("fails closed when hosted grants cannot use durable storage", async () => {
    vi.stubEnv("UNIONOPS_HOSTED_CUSTOMER_MODE", "true");
    await expect(issueMfaGrant("user-steward-7")).rejects.toThrow(
      /durable PostgreSQL storage/i,
    );
  });

  it("accepts a valid MFA grant nonce and sets mfaVerified", async () => {
    const nonce = await issueMfaGrant("user-steward-7");
    const token = await applyTrustedSessionUpdate(baseToken(), { mfaGrant: nonce });
    expect(token.mfaVerified).toBe(true);
  });

  it("sets mfaVerified when grant sessionVersion matches after a tenancy bump", async () => {
    const nonce = await issueMfaGrant("user-steward-7", Date.now(), 5);
    const token = baseToken({ sessionVersion: 4, mfaVerified: false });
    await refreshJwtTenancyIfStale(token);
    token.sessionVersion = 5;
    token.mfaVerified = false;
    const updated = await applyTrustedSessionUpdate(token, { mfaGrant: nonce });
    expect(updated.mfaVerified).toBe(true);
  });

  it("does not set mfaVerified when consume runs against a stale sessionVersion", async () => {
    const nonce = await issueMfaGrant("user-steward-7", Date.now(), 5);
    const token = await applyTrustedSessionUpdate(
      baseToken({ sessionVersion: 4 }),
      { mfaGrant: nonce },
    );
    expect(token.mfaVerified).toBe(false);
  });

  it("logs grant consume failures without setting mfaVerified", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("UNIONOPS_HOSTED_CUSTOMER_MODE", "true");
    const token = await applyTrustedSessionUpdate(baseToken(), {
      mfaGrant: "hosted-grant-without-postgres",
    });
    expect(token.mfaVerified).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      "[auth] MFA grant consume failed",
      expect.objectContaining({ userId: "user-steward-7" }),
    );
    errorSpy.mockRestore();
  });

  it("rejects a reused MFA grant nonce", async () => {
    const nonce = await issueMfaGrant("user-steward-7");
    expect(await consumeMfaGrant("user-steward-7", nonce)).toBe(true);
    const token = await applyTrustedSessionUpdate(baseToken(), { mfaGrant: nonce });
    expect(token.mfaVerified).toBe(false);
  });

  it("rejects an MFA grant issued before the session version changed", async () => {
    const nonce = await issueMfaGrant("user-steward-7", Date.now(), 4);
    const token = await applyTrustedSessionUpdate(
      baseToken({ sessionVersion: 5 }),
      { mfaGrant: nonce },
    );
    expect(token.mfaVerified).toBe(false);
    expect(await consumeMfaGrant("user-steward-7", nonce, Date.now(), 4)).toBe(false);
  });

  it("rejects an expired MFA grant nonce", async () => {
    const now = 1_000_000;
    vi.setSystemTime(now);
    const nonce = await issueMfaGrant("user-steward-7", now);
    const token = await applyTrustedSessionUpdate(
      baseToken(),
      { mfaGrant: nonce },
      now + 61_000,
    );
    expect(token.mfaVerified).toBe(false);
  });

  it("ignores client-supplied mfaVerified without a grant (SEC-001)", async () => {
    const token = await applyTrustedSessionUpdate(baseToken(), {
      mfaVerified: true,
    });
    expect(token.mfaVerified).toBe(false);
  });

  it("rejects local_steward switching to a local outside accessibleLocalIds", async () => {
    const token = await applyTrustedSessionUpdate(baseToken(), {
      localId: "local-1337",
    });
    expect(token.localId).toBe("local-7");
  });

  it("allows division_admin to switch to any localId", async () => {
    const token = await applyTrustedSessionUpdate(
      baseToken({
        sub: "user-division-admin",
        roles: ["division_admin"],
        accessibleLocalIds: ["local-7", "local-1337"],
      }),
      { localId: "local-1337", bargainingUnitId: undefined },
    );
    expect(token.localId).toBe("local-1337");
  });

  it("keeps union_admin on an assigned local (no all-locals clear)", async () => {
    const token = await applyTrustedSessionUpdate(
      baseToken({
        roles: ["union_admin"],
        accessibleLocalIds: ["local-7"],
        localId: "local-7",
      }),
      { localId: undefined },
    );
    expect(token.localId).toBe("local-7");
  });

  it("rejects bargainingUnitId that does not belong to the active local", async () => {
    const token = await applyTrustedSessionUpdate(baseToken(), {
      localId: "local-7",
      bargainingUnitId: "bu-not-real",
    });
    expect(token.bargainingUnitId).toBeUndefined();
  });

  it("accepts a bargainingUnitId that belongs to the active local", async () => {
    const token = await applyTrustedSessionUpdate(baseToken(), {
      localId: "local-7",
      bargainingUnitId: "bu-7-pt",
    });
    expect(token.bargainingUnitId).toBe("bu-7-pt");
  });
});
