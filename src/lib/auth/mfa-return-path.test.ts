import { describe, expect, it } from "vitest";
import {
  hubMfaChallengeHref,
  hubMfaSetupHref,
  localeMfaRedirect,
  safeMfaReturnPath,
} from "@/lib/auth/mfa-return-path";

describe("safeMfaReturnPath", () => {
  it("accepts Hub deep links and rejects open redirects and MFA loops", () => {
    expect(safeMfaReturnPath("/app/grievances/g-1")).toBe("/app/grievances/g-1");
    expect(safeMfaReturnPath("/app")).toBe("/app");
    expect(safeMfaReturnPath("/app/grievances?x=1")).toBe("/app/grievances");
    expect(safeMfaReturnPath("//evil.example")).toBeNull();
    expect(safeMfaReturnPath("https://evil.example/app")).toBeNull();
    expect(safeMfaReturnPath("/portal")).toBe("/portal");
    expect(safeMfaReturnPath("/tools/pulse-poll")).toBe("/tools/pulse-poll");
    expect(safeMfaReturnPath("/documents/acceptance")).toBe(
      "/documents/acceptance",
    );
    expect(safeMfaReturnPath("/app/mfa")).toBeNull();
    expect(safeMfaReturnPath("/app/mfa/setup")).toBeNull();
    expect(safeMfaReturnPath("/app/login")).toBeNull();
    expect(safeMfaReturnPath("/app/../etc/passwd")).toBeNull();
  });
});

describe("hub MFA href helpers", () => {
  it("builds challenge and setup hrefs with next and replace mode", () => {
    expect(hubMfaChallengeHref("/app/tasks")).toBe(
      "/app/mfa?next=%2Fapp%2Ftasks",
    );
    expect(hubMfaChallengeHref("/app/mfa")).toBe("/app/mfa");
    expect(hubMfaSetupHref("/app/time", "replace")).toBe(
      "/app/mfa/setup?next=%2Fapp%2Ftime&mode=replace",
    );
    expect(hubMfaSetupHref(null, "enroll")).toBe("/app/mfa/setup");
    expect(localeMfaRedirect("en", "/app/bumping")).toBe(
      "/en/app/mfa?next=%2Fapp%2Fbumping",
    );
  });
});
