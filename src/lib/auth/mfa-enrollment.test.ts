import { describe, expect, it } from "vitest";
import { buildOtpauthUri, generateTotpSecret } from "@/lib/auth/mfa-enrollment";
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
    const uri = buildOtpauthUri("JBSWY3DPEHPK3PXP", "president@local243.ca");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("issuer=UnionOps");
    expect(decodeURIComponent(uri)).toContain(
      "UnionOps:president@local243.ca",
    );
  });
});
