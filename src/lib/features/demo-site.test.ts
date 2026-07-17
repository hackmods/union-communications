import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isDemoSite } from "./demo-site";

describe("isDemoSite", () => {
  it("defaults to off when unset", () => {
    expect(isDemoSite({})).toBe(false);
  });

  it("is on for true/1/yes", () => {
    expect(isDemoSite({ NEXT_PUBLIC_DEMO_SITE: "true" })).toBe(true);
    expect(isDemoSite({ NEXT_PUBLIC_DEMO_SITE: "1" })).toBe(true);
    expect(isDemoSite({ NEXT_PUBLIC_DEMO_SITE: "yes" })).toBe(true);
    expect(isDemoSite({ NEXT_PUBLIC_DEMO_SITE: " TRUE " })).toBe(true);
  });

  it("is off for false/other values", () => {
    expect(isDemoSite({ NEXT_PUBLIC_DEMO_SITE: "false" })).toBe(false);
    expect(isDemoSite({ NEXT_PUBLIC_DEMO_SITE: "0" })).toBe(false);
    expect(isDemoSite({ NEXT_PUBLIC_DEMO_SITE: "no" })).toBe(false);
  });

  it("statically reads process.env.NEXT_PUBLIC_DEMO_SITE for Next inlining", () => {
    const source = readFileSync(join(__dirname, "demo-site.ts"), "utf8");
    expect(source).toMatch(
      /NEXT_PUBLIC_DEMO_SITE:\s*process\.env\.NEXT_PUBLIC_DEMO_SITE/,
    );
  });
});
