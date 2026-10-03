import { describe, expect, it } from "vitest";
import {
  accountRequiresMfa,
  rolesRequireHostedMfa,
  rolesRequireHostOperatorMfa,
  sessionRequiresMfa,
} from "@/lib/auth/mfa-requirements";
import { localMfaRequired } from "@/lib/auth/local-mfa-opt-in";

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

  it("keeps host operators on MFA independently of Local opt-in", () => {
    expect(rolesRequireHostOperatorMfa(["platform_admin"])).toBe(true);
    expect(rolesRequireHostOperatorMfa(["union_admin"])).toBe(true);
    expect(rolesRequireHostOperatorMfa(["division_admin"])).toBe(true);
    expect(rolesRequireHostOperatorMfa(["local_president"])).toBe(false);
    expect(rolesRequireHostOperatorMfa(["local_steward"])).toBe(false);
    expect(rolesRequireHostOperatorMfa([])).toBe(true);
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

  it("does not force Local officers onto MFA until the Local opts in or they enroll", () => {
    expect(accountRequiresMfa({
      roles: ["local_president"],
      explicitMfaEnabled: false,
      legacyRequiresMfa: true,
      hostedCustomerMode: true,
    })).toBe(false);
    expect(accountRequiresMfa({
      roles: ["local_steward"],
      explicitMfaEnabled: false,
      legacyRequiresMfa: true,
      hostedCustomerMode: true,
      localMfaRequired: false,
    })).toBe(false);
    expect(accountRequiresMfa({
      roles: ["local_steward"],
      explicitMfaEnabled: false,
      legacyRequiresMfa: false,
      hostedCustomerMode: true,
      localMfaRequired: true,
    })).toBe(true);
    expect(accountRequiresMfa({
      roles: ["platform_admin"],
      explicitMfaEnabled: false,
      legacyRequiresMfa: false,
      hostedCustomerMode: true,
      localMfaRequired: false,
    })).toBe(true);
  });

  it("uses the session requirement for server and client access checks", () => {
    expect(sessionRequiresMfa({ roles: ["local_member"] }, true, true)).toBe(false);
    expect(sessionRequiresMfa({ roles: ["local_steward"] }, true, true)).toBe(false);
    expect(sessionRequiresMfa({ roles: ["local_president"] }, true, true)).toBe(false);
    expect(sessionRequiresMfa({ roles: ["platform_admin"] }, true, true)).toBe(true);
    expect(sessionRequiresMfa({ roles: ["local_member"], mfaRequired: false }, true, true)).toBe(false);
    expect(sessionRequiresMfa({ roles: ["local_steward"], mfaRequired: true }, true, true)).toBe(true);
    expect(sessionRequiresMfa({ mfaRequired: false }, true, true)).toBe(true);
    expect(sessionRequiresMfa({ roles: ["local_member"] }, false, false)).toBe(false);
  });

  it("treats a missing Local or memory backend as MFA opt-in off", async () => {
    expect(await localMfaRequired("", { AUTH_USERS_BACKEND: "postgres" })).toBe(false);
    expect(await localMfaRequired("local-1", { AUTH_USERS_BACKEND: "memory" })).toBe(false);
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
