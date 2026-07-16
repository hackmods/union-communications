import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * PreferencesInitScript mutates <html> data-* attrs before hydrate.
 * Losing suppressHydrationWarning reintroduces production React #418.
 */
describe("locale layout hydration contract", () => {
  it("suppresses hydration warnings on <html>", () => {
    const source = readFileSync(
      join(__dirname, "layout.tsx"),
      "utf8",
    );
    expect(source).toMatch(/<html\b[^>]*\bsuppressHydrationWarning\b/);
  });
});
