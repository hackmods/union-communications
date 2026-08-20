import { describe, expect, it } from "vitest";
import {
  loginHrefForInviteRoles,
  nextPathForInviteRoles,
  resolvePostLoginHref,
  safePostLoginPath,
} from "@/lib/auth/post-login-path";

describe("safePostLoginPath", () => {
  it("allows Hub and Portal homes plus first-run setup", () => {
    expect(safePostLoginPath("/app/onboarding")).toBe("/app/onboarding");
    expect(safePostLoginPath("/app/invites")).toBe("/app/invites");
    expect(safePostLoginPath("/portal")).toBe("/portal");
    expect(safePostLoginPath("/app")).toBe("/app");
  });

  it("rejects off-site and unknown paths", () => {
    expect(safePostLoginPath("https://evil.example/app")).toBeNull();
    expect(safePostLoginPath("//evil.example")).toBeNull();
    expect(safePostLoginPath("/app/onboarding?x=1")).toBe("/app/onboarding");
    expect(safePostLoginPath("/app/grievances")).toBeNull();
    expect(safePostLoginPath("/app/onboarding/../login")).toBeNull();
  });
});

describe("invite first-run login", () => {
  it("sends presidents to union setup and members to Portal", () => {
    expect(nextPathForInviteRoles(["local_president"])).toBe("/app/onboarding");
    expect(nextPathForInviteRoles(["local_member"])).toBe("/portal");
    expect(nextPathForInviteRoles(["local_steward"])).toBeNull();
    expect(loginHrefForInviteRoles(["local_president"])).toBe(
      "/app/login?next=%2Fapp%2Fonboarding",
    );
  });

  it("honors allowlisted next without changing later officer home", () => {
    expect(
      resolvePostLoginHref({
        roles: ["local_president"],
        next: "/app/onboarding",
      }),
    ).toBe("/app/onboarding");
    expect(
      resolvePostLoginHref({
        roles: ["local_president"],
        next: "/app/grievances",
      }),
    ).toBe("/app");
  });
});
