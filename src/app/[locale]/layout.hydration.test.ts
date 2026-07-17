import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * PreferencesInitScript mutates <html> data-* attrs before hydrate.
 * Losing suppressHydrationWarning reintroduces production React #418.
 * next/script beforeInteractive also caused head tree mismatches — keep a
 * blocking inline <script> instead.
 */
describe("locale layout hydration contract", () => {
  it("suppresses hydration warnings on <html>", () => {
    const source = readFileSync(join(__dirname, "layout.tsx"), "utf8");
    expect(source).toMatch(/<html\b[^>]*\bsuppressHydrationWarning\b/);
  });

  it("uses a blocking inline script (not next/script) for prefs FOUC", () => {
    const source = readFileSync(
      join(
        __dirname,
        "../../components/providers/PreferencesInitScript.tsx",
      ),
      "utf8",
    );
    expect(source).not.toMatch(/from ["']next\/script["']/);
    expect(source).not.toContain("beforeInteractive");
    expect(source).toMatch(/<script\b/);
    expect(source).toContain("dangerouslySetInnerHTML");
  });
});
