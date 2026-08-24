import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findDemoUser, DEMO_PASSWORD_HASH } from "@/lib/auth/demo-users";
import { isDemoAuthEnabled } from "@/lib/auth/demo-auth-gate";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import {
  acceptInvite,
  createInvite,
  findInvitedUser,
  resetInviteStoreForTests,
} from "@/lib/auth/invites";

describe("password helpers", () => {
  it("verifies the demo bcrypt hash against demo123", async () => {
    await expect(verifyPassword("demo123", DEMO_PASSWORD_HASH)).resolves.toBe(
      true,
    );
    await expect(verifyPassword("wrong", DEMO_PASSWORD_HASH)).resolves.toBe(
      false,
    );
    await expect(verifyPassword("Demo123", DEMO_PASSWORD_HASH)).resolves.toBe(
      false,
    );
  });

  it("hashes and verifies a new password", async () => {
    const hash = await hashPassword("secret-pass");
    await expect(verifyPassword("secret-pass", hash)).resolves.toBe(true);
  });
});

describe("demo auth gate", () => {
  it("allows demo in non-production by default", () => {
    expect(
      isDemoAuthEnabled({ NODE_ENV: "test" }),
    ).toBe(true);
  });

  it("blocks demo in production without explicit flag", () => {
    expect(
      isDemoAuthEnabled({ NODE_ENV: "production" }),
    ).toBe(false);
  });

  it("allows demo in production when AUTH_ALLOW_DEMO_USERS is true", () => {
    expect(
      isDemoAuthEnabled({
        NODE_ENV: "production",
        AUTH_ALLOW_DEMO_USERS: "true",
      }),
    ).toBe(true);
  });

  it("allows demo in production when DEMO_SITE is true", () => {
    expect(
      isDemoAuthEnabled({
        NODE_ENV: "production",
        NEXT_PUBLIC_DEMO_SITE: "true",
      }),
    ).toBe(true);
  });

  it("statically reads NEXT_PUBLIC_DEMO_SITE when env is process.env", () => {
    const source = readFileSync(
      join(__dirname, "demo-auth-gate.ts"),
      "utf8",
    );
    expect(source).toMatch(/env === process\.env/);
    expect(source).toMatch(
      /NEXT_PUBLIC_DEMO_SITE:\s*process\.env\.NEXT_PUBLIC_DEMO_SITE/,
    );
  });
});

describe("findDemoUser", () => {
  it("authenticates with bcrypt, not plaintext equality", async () => {
    const user = await findDemoUser("president.243@unionops.test", "demo123", {
      NODE_ENV: "test",
    });
    expect(user?.id).toBe("user-president-243");
    expect(
      (user as { password?: string } | null)?.password,
    ).toBeUndefined();
    await expect(
      findDemoUser("president.243@unionops.test", "Demo123", { NODE_ENV: "test" }),
    ).resolves.toMatchObject({ id: "user-president-243" });
    await expect(
      findDemoUser("president.243@unionops.test", "nope", { NODE_ENV: "test" }),
    ).resolves.toBeNull();
  });

  it("refuses demo login when production gate is closed", async () => {
    await expect(
      findDemoUser("president.243@unionops.test", "demo123", {
        NODE_ENV: "production",
      }),
    ).resolves.toBeNull();
  });
});

describe("invite accept flow", () => {
  beforeEach(() => {
    resetInviteStoreForTests();
  });

  it("creates invite, accepts with password, and allows login lookup", async () => {
    const invite = await createInvite({
      email: "new.steward@example.ca",
      name: "New Steward",
      unionId: "union-opseu",
      localId: "local-243",
      roles: ["local_steward"],
      invitedById: "user-president-243",
    });
    const accepted = await acceptInvite(invite.token, "securepass1");
    expect(accepted.user?.email).toBe("new.steward@example.ca");
    const found = await findInvitedUser(
      "new.steward@example.ca",
      "securepass1",
    );
    expect(found?.name).toBe("New Steward");
  });
});
