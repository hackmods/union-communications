import { describe, expect, it, beforeEach } from "vitest";
import {
  acceptInvite,
  createInvite,
  findInvitedUser,
  resetInviteStoreForTests,
} from "@/lib/auth/invites";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  getPasswordResetToken,
  resetPasswordResetStoreForTests,
} from "@/lib/auth/password-reset";
import {
  findResettableAccountByEmail,
  persistPasswordForEmail,
} from "@/lib/auth/persist-user-password";
import { hashPassword } from "@/lib/auth/password";
import { buildPasswordResetEmail } from "@/lib/email/messages";

describe("password reset tokens", () => {
  beforeEach(() => {
    resetPasswordResetStoreForTests();
    resetInviteStoreForTests();
  });

  it("creates a consumable token and rejects a second consume", () => {
    const row = createPasswordResetToken({
      email: "officer@example.ca",
      userId: "user-1",
    });
    expect(getPasswordResetToken(row.token)?.email).toBe("officer@example.ca");

    const first = consumePasswordResetToken(row.token);
    expect(first.ok).toBe(true);

    const second = consumePasswordResetToken(row.token);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("consumed");
  });

  it("invalidates prior unused tokens for the same email", () => {
    const first = createPasswordResetToken({
      email: "officer@example.ca",
      userId: "user-1",
    });
    const second = createPasswordResetToken({
      email: "officer@example.ca",
      userId: "user-1",
    });
    expect(getPasswordResetToken(first.token)?.consumedAt).toBeTruthy();
    expect(getPasswordResetToken(second.token)?.consumedAt).toBeUndefined();
  });
});

describe("persist password for invitees", () => {
  beforeEach(() => {
    resetInviteStoreForTests();
    resetPasswordResetStoreForTests();
  });

  it("updates invited user password and allows login with the new one", async () => {
    const invite = createInvite({
      email: "new.officer@example.ca",
      name: "New Officer",
      unionId: "union-opseu",
      localId: "local-243",
      roles: ["local_steward"],
      invitedById: "admin-1",
    });
    const accepted = await acceptInvite(invite.token, "oldpassword");
    expect(accepted.user).toBeTruthy();

    const account = await findResettableAccountByEmail("new.officer@example.ca");
    expect(account?.source).toBe("invite");

    const hash = await hashPassword("newpassword1");
    const persisted = await persistPasswordForEmail(
      "new.officer@example.ca",
      hash,
    );
    expect(persisted.ok).toBe(true);

    await expect(
      findInvitedUser("new.officer@example.ca", "oldpassword"),
    ).resolves.toBeNull();
    await expect(
      findInvitedUser("new.officer@example.ca", "newpassword1"),
    ).resolves.toMatchObject({ email: "new.officer@example.ca" });
  });

  it("does not treat demo roster as resettable", async () => {
    await expect(
      findResettableAccountByEmail("president@local243.ca"),
    ).resolves.toBeNull();
  });
});

describe("buildPasswordResetEmail", () => {
  it("includes reset URL and expiry", () => {
    const copy = buildPasswordResetEmail({
      name: "Local President",
      resetUrl: "http://localhost:3000/en/app/reset-password/abc",
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
    expect(copy.subject).toMatch(/password/i);
    expect(copy.text).toContain("http://localhost:3000/en/app/reset-password/abc");
    expect(copy.text).toContain("Local President");
  });
});
