import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/rls-context", () => ({
  withRlsContext: vi.fn(async () => {
    throw new Error("simulated Postgres outage");
  }),
}));

import {
  assertNoPendingMfaGrant,
  clearMfaGrants,
  consumeMfaGrant,
  getMfaGrant,
  issueMfaGrant,
  MfaGrantPendingError,
} from "@/lib/auth/mfa-grants";

const postgresEnv = {
  AUTH_USERS_BACKEND: "postgres",
  DATABASE_URL: "postgres://example.invalid/unionops",
  UNIONOPS_HOSTED_CUSTOMER_MODE: "true",
} as unknown as NodeJS.ProcessEnv;

afterEach(() => {
  clearMfaGrants();
  vi.unstubAllEnvs();
});

describe("MFA grants with a selected durable backend", () => {
  it("does not issue a memory grant when the durable write fails", async () => {
    await expect(issueMfaGrant("user-a", Date.now(), 0, postgresEnv)).rejects.toThrow(
      "simulated Postgres outage",
    );
  });

  it("does not consume a memory grant when the durable consume fails", async () => {
    vi.stubEnv("AUTH_USERS_BACKEND", "memory");
    const nonce = await issueMfaGrant("user-a", Date.now(), 0, {
      AUTH_USERS_BACKEND: "memory",
    } as unknown as NodeJS.ProcessEnv);
    await expect(
      consumeMfaGrant("user-a", nonce, Date.now(), 0, postgresEnv),
    ).rejects.toThrow("simulated Postgres outage");
  });
});

describe("MFA grant handoff policy", () => {
  const memoryEnv = { AUTH_USERS_BACKEND: "memory" } as unknown as NodeJS.ProcessEnv;

  it("preserves a pending browser grant and refuses to mint a replacement", async () => {
    const first = await issueMfaGrant("user-pending", Date.now(), 3, memoryEnv);
    await expect(assertNoPendingMfaGrant("user-pending", Date.now(), 3, memoryEnv))
      .rejects.toBeInstanceOf(MfaGrantPendingError);
    await expect(issueMfaGrant("user-pending", Date.now(), 3, memoryEnv, { rejectPending: true }))
      .rejects.toBeInstanceOf(MfaGrantPendingError);
    expect(getMfaGrant("user-pending")?.nonce).toBe(first);
  });

  it("allows a new grant after the previous one expires or belongs to an old session", async () => {
    await issueMfaGrant("user-expired", 1_000, 3, memoryEnv);
    const fresh = await issueMfaGrant("user-expired", 62_000, 3, memoryEnv, { rejectPending: true });
    expect(fresh).toBeTruthy();

    await issueMfaGrant("user-version", Date.now(), 3, memoryEnv);
    await expect(issueMfaGrant("user-version", Date.now(), 4, memoryEnv, { rejectPending: true }))
      .resolves.toBeTruthy();
  });
});
