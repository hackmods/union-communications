import { describe, expect, it } from "vitest";
import {
  classifySubmittedMfaCode,
  isMfaClientCode,
  looksLikeRecoveryCode,
  looksLikeTotpCode,
  officerMfaErrorMessage,
} from "@/lib/auth/mfa-client-codes";

describe("classifySubmittedMfaCode", () => {
  it("treats blank input as empty, not recovery", () => {
    expect(classifySubmittedMfaCode("")).toBe("empty");
    expect(classifySubmittedMfaCode("   ")).toBe("empty");
    expect(looksLikeRecoveryCode("")).toBe(false);
  });

  it("recognizes six-digit TOTP", () => {
    expect(looksLikeTotpCode("424242")).toBe(true);
    expect(classifySubmittedMfaCode("424242")).toBe("totp");
  });

  it("recognizes dashed recovery codes without treating TOTP as recovery", () => {
    expect(looksLikeRecoveryCode("ABCD-EFGH-IJKL-MNOP")).toBe(true);
    expect(classifySubmittedMfaCode("ABCD-EFGH-IJKL-MNOP")).toBe("recovery");
    expect(looksLikeRecoveryCode("123456")).toBe(false);
  });

  it("rejects short or junk values without calling them recovery", () => {
    expect(classifySubmittedMfaCode("12")).toBe("invalid");
    expect(classifySubmittedMfaCode("not-a-code")).toBe("invalid");
  });
});

describe("officerMfaErrorMessage", () => {
  it("maps known codes and falls back otherwise", () => {
    expect(isMfaClientCode("replayed")).toBe(true);
    expect(isMfaClientCode("attempt_store_unavailable")).toBe(true);
    expect(isMfaClientCode("grant_unavailable")).toBe(true);
    expect(isMfaClientCode("replay_store_unavailable")).toBe(true);
    expect(
      officerMfaErrorMessage("replayed", (key) => `t:${key}`, "fallback"),
    ).toBe("t:replayed");
    expect(
      officerMfaErrorMessage(
        "attempt_store_unavailable",
        (key) => `t:${key}`,
        "fallback",
      ),
    ).toBe("t:attempt_store_unavailable");
    expect(officerMfaErrorMessage("nope", () => "x", "fallback")).toBe("fallback");
  });
});
