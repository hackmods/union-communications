import { describe, expect, it } from "vitest";
import { mfaErrorMetadata } from "@/lib/auth/mfa-durable-fallback-signal";

describe("MFA safe error metadata", () => {
  it("keeps the nested SQLSTATE and omits query text and bound parameters", () => {
    const postgresError = Object.assign(new Error("permission denied"), {
      code: "42501",
    });
    const driverError = Object.assign(
      new Error("Failed query params: encrypted-totp-value"),
      { cause: postgresError },
    );

    const metadata = mfaErrorMetadata(driverError);

    expect(metadata).toEqual({ errorType: "Error", sqlState: "42501" });
    expect(JSON.stringify(metadata)).not.toContain("encrypted-totp-value");
    expect(JSON.stringify(metadata)).not.toContain("Failed query");
  });

  it("omits provider messages when no SQLSTATE is available", () => {
    const metadata = mfaErrorMetadata(new Error("secret query parameter"));

    expect(metadata).toEqual({ errorType: "Error" });
    expect(JSON.stringify(metadata)).not.toContain("secret query parameter");
  });
});
