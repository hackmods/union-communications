import { describe, expect, it } from "vitest";
import { resolveMfaCopyIntent } from "@/lib/auth/mfa-copy-context";

describe("resolveMfaCopyIntent", () => {
  it("maps next prefixes and explicit steps", () => {
    expect(resolveMfaCopyIntent({ next: "/app/grievances/1" })).toBe(
      "grievances",
    );
    expect(resolveMfaCopyIntent({ next: "/app/bumping" })).toBe("bumping");
    expect(resolveMfaCopyIntent({ next: "/app/time/admin" })).toBe("time");
    expect(resolveMfaCopyIntent({ next: "/app/tasks" })).toBe("casework");
    expect(resolveMfaCopyIntent({ next: null })).toBe("setup");
    expect(resolveMfaCopyIntent({ next: "/app" })).toBe("setup");
    expect(resolveMfaCopyIntent({ step: "replace" })).toBe("replace");
    expect(resolveMfaCopyIntent({ step: "enroll", next: "/app/grievances" })).toBe(
      "enroll",
    );
    expect(resolveMfaCopyIntent({ step: "manage" })).toBe("manage");
  });
});
