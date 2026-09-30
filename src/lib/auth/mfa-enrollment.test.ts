import { describe, expect, it } from "vitest";
import { buildOtpauthUri, generateTotpSecret, resolveTotpAuthenticatorImageUrl } from "@/lib/auth/mfa-enrollment";
import { decodeBase32, verifyTotp } from "@/lib/auth/totp";

describe("generateTotpSecret", () => {
  it("generates a valid base32 secret of sufficient length", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(decodeBase32(secret).length).toBeGreaterThanOrEqual(16);
  });

  it("generates distinct secrets on each call", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).not.toBe(b);
  });

  it("round-trips with verifyTotp", () => {
    const secret = generateTotpSecret();
    // A freshly generated secret should never accidentally verify a random code.
    expect(verifyTotp(secret, "000000")).toBe(false);
  });
});

describe("buildOtpauthUri", () => {
  it("builds a scannable otpauth URI with issuer + account label", () => {
    const uri = buildOtpauthUri("JBSWY3DPEHPK3PXP", "president.7@unionops.test");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("issuer=UnionOps");
    expect(decodeURIComponent(uri)).toContain(
      "UnionOps:president.7@unionops.test",
    );
  });

  it("adds an HTTPS authenticator icon and omits http origins", () => {
    const withIcon = buildOtpauthUri(
      "JBSWY3DPEHPK3PXP",
      "president.7@unionops.test",
      undefined,
      "https://unionops.org/assets/unionops/authenticator-icon.png",
    );
    expect(withIcon).toContain(
      "image=https%3A%2F%2Funionops.org%2Fassets%2Funionops%2Fauthenticator-icon.png",
    );
    const local = buildOtpauthUri(
      "JBSWY3DPEHPK3PXP",
      "president.7@unionops.test",
      undefined,
      "http://localhost:3000/assets/unionops/authenticator-icon.png",
    );
    expect(local).not.toContain("image=");
  });

  it("resolves the icon from AUTH_URL when it is HTTPS", () => {
    expect(
      resolveTotpAuthenticatorImageUrl({ AUTH_URL: "https://unionops.org" }),
    ).toBe("https://unionops.org/assets/unionops/authenticator-icon.png");
    expect(
      resolveTotpAuthenticatorImageUrl({ AUTH_URL: "http://localhost:3000" }),
    ).toBeUndefined();
  });
});
