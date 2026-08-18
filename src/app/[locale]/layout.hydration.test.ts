import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * FOUC boot scripts mutate <html> before hydrate (prefs data-* / Brand Kit
 * chrome CSS vars). Losing suppressHydrationWarning reintroduces production
 * React #418. Prefer blocking inline <script> over next/script.
 */
describe("locale layout hydration contract", () => {
  it("suppresses hydration warnings on <html>", () => {
    const source = readFileSync(join(__dirname, "layout.tsx"), "utf8");
    expect(source).toMatch(/<html\b[^>]*\bsuppressHydrationWarning\b/);
    expect(source).toContain("<BrandChromeInitScript");
    expect(source).toContain("<PreferencesInitScript");
  });

  it("uses a blocking inline script (not next/script) for prefs FOUC", () => {
    assertBlockingFoucScript(
      "../../components/providers/PreferencesInitScript.tsx",
    );
  });

  it("uses a blocking inline script (not next/script) for Brand Kit chrome FOUC", () => {
    const source = assertBlockingFoucScript(
      "../../components/providers/BrandChromeInitScript.tsx",
    );
    expect(source).toContain("BRAND_KIT_KEY");
    expect(source).toContain("LEGACY_BRAND_KIT_KEY");
    expect(source).toContain("--opseu-blue");
    expect(source).not.toMatch(/innerHTML\s*=/);
  });
});

function assertBlockingFoucScript(relativePath: string): string {
  const raw = readFileSync(join(__dirname, relativePath), "utf8");
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  expect(source).not.toMatch(/from ["']next\/script["']/);
  expect(source).not.toContain("beforeInteractive");
  expect(source).toMatch(/<script\b/);
  expect(source).toContain("dangerouslySetInnerHTML");
  return source;
}
