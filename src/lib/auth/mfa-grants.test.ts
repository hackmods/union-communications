import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/rls-context", () => ({
  withRlsContext: vi.fn(async () => {
    throw new Error("simulated Postgres outage");
  }),
}));

import {
  clearMfaGrants,
  consumeMfaGrant,
  issueMfaGrant,
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
