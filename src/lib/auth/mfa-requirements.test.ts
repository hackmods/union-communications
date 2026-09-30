import { describe, expect, it } from "vitest";
import {
  accountRequiresMfa,
  rolesRequireHostedMfa,
  sessionRequiresMfa,
} from "@/lib/auth/mfa-requirements";

describe("hosted capability-based MFA scope", () => {
  it("requires MFA for every current role with privileged or sensitive module access", () => {
    for (const role of [
      "platform_admin",
      "union_admin",
      "division_admin",
      "local_president",
      "local_steward",
      "local_exec",
      "stability_member",
      "solo_account",
    ]) {
      expect(rolesRequireHostedMfa([role])).toBe(true);
    }
  });

  it("does not require hosted MFA for a basic local member alone", () => {
    expect(rolesRequireHostedMfa(["local_member"])).toBe(false);
  });

  it("fails closed for missing and newly introduced role claims", () => {
    expect(rolesRequireHostedMfa([])).toBe(true);
    expect(rolesRequireHostedMfa(undefined)).toBe(true);
    expect(rolesRequireHostedMfa(["local_member", "future_privileged_role"])).toBe(true);
  });

  it("keeps individual MFA opt-in and privileged role requirements distinct", () => {
    expect(accountRequiresMfa({
      roles: ["local_member"],
      explicitMfaEnabled: false,
      legacyRequiresMfa: true,
      hostedCustomerMode: true,
    })).toBe(false);
    expect(accountRequiresMfa({
      roles: ["local_member"],
      explicitMfaEnabled: true,
      legacyRequiresMfa: false,
      hostedCustomerMode: true,
    })).toBe(true);
    expect(accountRequiresMfa({
      roles: ["local_member"],
      explicitMfaEnabled: false,
      legacyRequiresMfa: true,
      hostedCustomerMode: false,
    })).toBe(true);
  });

  it("uses the session requirement for server and client access checks", () => {
    expect(sessionRequiresMfa({ roles: ["local_member"] }, true, true)).toBe(false);
    expect(sessionRequiresMfa({ roles: ["local_steward"] }, true, true)).toBe(true);
    expect(sessionRequiresMfa({ roles: ["local_member"], mfaRequired: false }, true, true)).toBe(false);
    expect(sessionRequiresMfa({ roles: ["local_member"], mfaRequired: true }, true, true)).toBe(true);
    expect(sessionRequiresMfa({ mfaRequired: false }, true, true)).toBe(true);
    expect(sessionRequiresMfa({ roles: ["local_member"] }, false, false)).toBe(false);
  });

  it("exempts AUTH_MFA_OPERATOR_BYPASS_EMAILS from session and account MFA", () => {
    const env = { AUTH_MFA_OPERATOR_BYPASS_EMAILS: "ryan@ryanmorris.ca" };
    expect(
      sessionRequiresMfa(
        { email: "Ryan@RyanMorris.ca", roles: ["platform_admin"] },
        true,
        true,
        env,
      ),
    ).toBe(false);
    expect(
      accountRequiresMfa({
        email: "ryan@ryanmorris.ca",
        roles: ["platform_admin"],
        explicitMfaEnabled: true,
        legacyRequiresMfa: true,
        hostedCustomerMode: true,
        env,
      }),
    ).toBe(false);
  });
});
