import { describe, expect, it } from "vitest";
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
});
