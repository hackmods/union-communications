import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isOfficerHubPublic } from "./officer-hub-public";

describe("isOfficerHubPublic", () => {
  it("defaults to off when unset", () => {
    expect(isOfficerHubPublic({})).toBe(false);
  });

  it("is on for true/1/yes", () => {
    expect(isOfficerHubPublic({ NEXT_PUBLIC_OFFICER_HUB_PUBLIC: "true" })).toBe(
      true,
    );
    expect(isOfficerHubPublic({ NEXT_PUBLIC_OFFICER_HUB_PUBLIC: "1" })).toBe(
      true,
    );
    expect(isOfficerHubPublic({ NEXT_PUBLIC_OFFICER_HUB_PUBLIC: "yes" })).toBe(
      true,
    );
    expect(isOfficerHubPublic({ NEXT_PUBLIC_OFFICER_HUB_PUBLIC: " TRUE " })).toBe(
      true,
    );
  });

  it("is off for false/other values", () => {
    expect(isOfficerHubPublic({ NEXT_PUBLIC_OFFICER_HUB_PUBLIC: "false" })).toBe(
      false,
    );
    expect(isOfficerHubPublic({ NEXT_PUBLIC_OFFICER_HUB_PUBLIC: "0" })).toBe(
      false,
    );
    expect(isOfficerHubPublic({ NEXT_PUBLIC_OFFICER_HUB_PUBLIC: "no" })).toBe(
      false,
    );
  });

  it("statically reads process.env.NEXT_PUBLIC_OFFICER_HUB_PUBLIC for Next inlining", () => {
    const source = readFileSync(join(__dirname, "officer-hub-public.ts"), "utf8");
    expect(source).toMatch(
      /NEXT_PUBLIC_OFFICER_HUB_PUBLIC:\s*process\.env\.NEXT_PUBLIC_OFFICER_HUB_PUBLIC/,
    );
  });
});
