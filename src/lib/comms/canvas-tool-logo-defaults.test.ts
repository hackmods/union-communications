import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const TOOLS_ROOT = join(process.cwd(), "src", "app", "[locale]", "tools");

/** Canvas tools that own a logoMode field after the branding refactor. */
const LOGO_MODE_TOOLS = [
  "action-card",
  "board-banner",
  "board-notice",
  "flyer-maker",
  "graphic-maker",
  "meeting-background",
  "pulse-poll",
  "qr-board",
  "qr-card",
  "quote-card",
  "solidarity-poster",
] as const;

function pageSource(toolSlug: string): string {
  const page = join(TOOLS_ROOT, toolSlug, "page.tsx");
  expect(statSync(page).isFile(), `${toolSlug}/page.tsx must exist`).toBe(true);
  return readFileSync(page, "utf8");
}

describe("canvas tool logoMode defaults (source guard)", () => {
  it.each(LOGO_MODE_TOOLS)(
    "%s initializes logoMode from the shared lockup default",
    (toolSlug) => {
      const source = pageSource(toolSlug);
      const usesSharedInitial =
        /logoMode:\s*INITIAL_LOGO_MODE/.test(source) ||
        source.includes("createEmptyPulsePollDraft");
      expect(usesSharedInitial).toBe(true);
      // Initial / buildInitial must not hardcode the empty-canvas default.
      expect(source).not.toMatch(/logoMode:\s*"none"/);
    },
  );

  it("covers every tools/* page that imports BoardLogoMode or logoMode state", () => {
    const slugs = readdirSync(TOOLS_ROOT).filter((name) =>
      statSync(join(TOOLS_ROOT, name)).isDirectory(),
    );
    const withLogoMode = slugs.filter((slug) => {
      const page = join(TOOLS_ROOT, slug, "page.tsx");
      try {
        if (!statSync(page).isFile()) return false;
      } catch {
        return false;
      }
      const source = readFileSync(page, "utf8");
      return (
        source.includes("logoMode") &&
        (source.includes("BoardLogoMode") ||
          source.includes("canvas-logo-mode") ||
          source.includes("CanvasBrandingControls"))
      );
    });

    expect(withLogoMode.sort()).toEqual([...LOGO_MODE_TOOLS].sort());
  });

  it("flyer deep-preset seed applies logoMode with the theme default", () => {
    const source = pageSource("flyer-maker");
    // Deep preset path must not return before seeding branding.
    expect(source).toMatch(
      /fromDeep[\s\S]*?logoMode:\s*defaultLogoMode\(themeEstablished\)/,
    );
  });

  it("lists relative paths for failures", () => {
    for (const slug of LOGO_MODE_TOOLS) {
      const rel = relative(process.cwd(), join(TOOLS_ROOT, slug, "page.tsx"));
      expect(rel.replace(/\\/g, "/")).toBe(
        `src/app/[locale]/tools/${slug}/page.tsx`,
      );
    }
  });
});
