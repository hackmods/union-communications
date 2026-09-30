import { describe, expect, it } from "vitest";
import {
  isMfaOperatorBypassConfigured,
  isMfaOperatorBypassEmail,
  parseMfaOperatorBypassEmails,
} from "@/lib/auth/mfa-operator-bypass";

describe("mfa-operator-bypass", () => {
  it("returns an empty set when unset or blank", () => {
    expect(parseMfaOperatorBypassEmails({})).toEqual(new Set());
    expect(parseMfaOperatorBypassEmails({ AUTH_MFA_OPERATOR_BYPASS_EMAILS: "  " })).toEqual(
      new Set(),
    );
    expect(isMfaOperatorBypassConfigured({})).toBe(false);
  });

  it("parses comma and semicolon lists, ignoring case and junk tokens", () => {
    const emails = parseMfaOperatorBypassEmails({
      AUTH_MFA_OPERATOR_BYPASS_EMAILS:
        " Ryan@RyanMorris.ca , ops@example.org;not-an-email;  alice@union.ca ",
    });
    expect(emails).toEqual(
      new Set(["ryan@ryanmorris.ca", "ops@example.org", "alice@union.ca"]),
    );
    expect(isMfaOperatorBypassConfigured({
      AUTH_MFA_OPERATOR_BYPASS_EMAILS: "ryan@ryanmorris.ca",
    })).toBe(true);
  });

  it("matches allowlisted emails case-insensitively", () => {
    const env = { AUTH_MFA_OPERATOR_BYPASS_EMAILS: "ryan@ryanmorris.ca" };
    expect(isMfaOperatorBypassEmail("Ryan@RyanMorris.ca", env)).toBe(true);
    expect(isMfaOperatorBypassEmail(" other@example.org ", env)).toBe(false);
    expect(isMfaOperatorBypassEmail(null, env)).toBe(false);
    expect(isMfaOperatorBypassEmail("", env)).toBe(false);
  });
});
