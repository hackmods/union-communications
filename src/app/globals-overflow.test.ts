import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const srcRoot = join(__dirname, "..");

describe("desktop / PWA horizontal overflow", () => {
  it("clips html overflow-x so 100vw leftovers cannot scroll the window", () => {
    const css = readFileSync(join(__dirname, "globals.css"), "utf8");
    expect(css).toMatch(/html\s*\{[^}]*overflow-x:\s*clip/);
  });

  it("does not full-bleed the home hero with 100vw (scrollbar-gutter overflow)", () => {
    const source = readFileSync(
      join(srcRoot, "components/pages/HomeContent.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/\bw-screen\b/);
    expect(source).not.toMatch(/100vw/);
    expect(source).toMatch(/home-hero[^"]*w-full/);
  });

  it("lets Brand Kit workspace cards shrink in CSS grid", () => {
    const card = readFileSync(
      join(srcRoot, "components/ui/Card.tsx"),
      "utf8",
    );
    const page = readFileSync(
      join(srcRoot, "app/[locale]/brand-kit/page.tsx"),
      "utf8",
    );
    expect(card).toMatch(/min-w-0 rounded-xl border/);
    expect(page).toMatch(/grid min-w-0 items-start/);
  });
});
