import { describe, expect, it } from "vitest";
import {
  DEMO_LOGIN_ACCOUNTS,
  DEMO_LOGIN_ROLE_KEYS,
  DEMO_SHARED_PASSWORD,
} from "./demo-login-accounts";
import { DEMO_EMAIL_DOMAIN, DEMO_USERS, demoEmail } from "./demo-users";

describe("demo roster emails", () => {
  it("uses the reserved unionops.test domain only", () => {
    expect(DEMO_EMAIL_DOMAIN).toBe("unionops.test");
    expect(demoEmail("president.243")).toBe("president.243@unionops.test");
    for (const user of DEMO_USERS) {
      expect(user.email.endsWith(`@${DEMO_EMAIL_DOMAIN}`), user.id).toBe(true);
      expect(user.email.split("@")[1], user.id).toBe(DEMO_EMAIL_DOMAIN);
      expect(user.email).not.toMatch(/@(opseu\.org|local243\.ca|example\.ca)$/i);
    }
  });

  it("lists every demo user on the login Callout", () => {
    expect(DEMO_SHARED_PASSWORD).toBe("demo123");
    expect(DEMO_LOGIN_ACCOUNTS.map((row) => row.userId).sort()).toEqual(
      DEMO_USERS.map((user) => user.id).sort(),
    );
    expect(DEMO_LOGIN_ACCOUNTS.map((row) => row.email).sort()).toEqual(
      DEMO_USERS.map((user) => user.email).sort(),
    );
    expect(DEMO_LOGIN_ACCOUNTS.map((row) => row.roleKey).sort()).toEqual(
      [...DEMO_LOGIN_ROLE_KEYS].sort(),
    );
  });
});
