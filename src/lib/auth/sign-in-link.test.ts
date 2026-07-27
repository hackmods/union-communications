import { afterEach, describe, expect, it } from "vitest";
import {
  clearSignInGrants,
  consumeSignInGrant,
  issueSignInGrant,
} from "@/lib/auth/sign-in-grants";
import {
  createSignInToken,
  consumeSignInToken,
  resetSignInTokenStoreForTests,
} from "@/lib/auth/sign-in-link";

afterEach(() => {
  resetSignInTokenStoreForTests();
  clearSignInGrants();
});

describe("sign-in link tokens (memory)", () => {
  it("creates and consumes a one-time token", async () => {
    const row = await createSignInToken({
      email: "president@local243.ca",
      userId: "user-president-243",
    });
    expect(row.token.length).toBeGreaterThan(10);

    const first = await consumeSignInToken(row.token);
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.row.userId).toBe("user-president-243");
    }

    const second = await consumeSignInToken(row.token);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("consumed");
  });
});

describe("sign-in grants", () => {
  it("issues a single-use grant", () => {
    const nonce = issueSignInGrant("user-1", "a@example.ca");
    const grant = consumeSignInGrant(nonce);
    expect(grant?.userId).toBe("user-1");
    expect(grant?.email).toBe("a@example.ca");
    expect(consumeSignInGrant(nonce)).toBeNull();
  });
});
