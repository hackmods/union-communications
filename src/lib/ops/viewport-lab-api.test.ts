import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildViewportLabSearchParams,
  isBlockedViewportPath,
  parseViewportLabSearchParams,
  sanitizeViewportFramePath,
  swapLocaleInPath,
} from "./viewport-lab-api";
import {
  VIEWPORT_LAB_API_VERSION,
  VIEWPORT_LAB_CAPABILITIES_V2,
  VIEWPORT_PRESETS,
  matchPreset,
  presetById,
} from "./viewport-presets";

describe("viewport-presets", () => {
  it("exposes mobile tablet desktop sizes", () => {
    expect(VIEWPORT_PRESETS.map((p) => p.id)).toEqual([
      "mobile",
      "tablet",
      "desktop",
    ]);
    expect(presetById("mobile")?.width).toBe(375);
    expect(matchPreset(768, 1024)).toBe("tablet");
    expect(matchPreset(400, 400)).toBeNull();
  });

  it("locks API version and capabilities contract", () => {
    expect(VIEWPORT_LAB_API_VERSION).toBe(1);
    for (const cap of [
      "viewport",
      "preset",
      "navigate",
      "orientation",
      "locale",
      "overflow",
      "axe",
      "compare",
    ]) {
      expect(VIEWPORT_LAB_CAPABILITIES_V2).toContain(cap);
    }
  });
});

describe("viewport-lab-api path sanitize", () => {
  it("accepts public same-origin paths", () => {
    expect(sanitizeViewportFramePath("/en/create/")).toBe("/en/create/");
    expect(sanitizeViewportFramePath("en/utilities/alt-text/")).toBe(
      "/en/utilities/alt-text/",
    );
  });

  it("blocks hub portal lab and api", () => {
    expect(sanitizeViewportFramePath("/en/app/grievances")).toBeNull();
    expect(sanitizeViewportFramePath("/fr/portal/")).toBeNull();
    expect(sanitizeViewportFramePath("/viewport-lab/")).toBeNull();
    expect(sanitizeViewportFramePath("/api/health")).toBeNull();
    expect(isBlockedViewportPath("/en/app/")).toBe(true);
  });

  it("rejects javascript and cross-scheme junk", () => {
    expect(sanitizeViewportFramePath("javascript:alert(1)")).toBeNull();
    expect(sanitizeViewportFramePath("data:text/html,hi")).toBeNull();
  });

  it("swaps locale prefixes", () => {
    expect(swapLocaleInPath("/en/create/", "fr")).toBe("/fr/create/");
    expect(swapLocaleInPath("/fr/", "en")).toBe("/en/");
  });

  it("round-trips query params", () => {
    const parsed = parseViewportLabSearchParams(
      new URLSearchParams(
        "w=375&h=812&path=/en/create/&locale=en&compare=1",
      ),
    );
    expect(parsed).toMatchObject({
      width: 375,
      height: 812,
      path: "/en/create/",
      locale: "en",
      compare: true,
    });
    const qs = buildViewportLabSearchParams(parsed);
    expect(qs).toContain("w=375");
    expect(qs).toContain("compare=1");
  });
});

describe("viewport-lab recipes", () => {
  it("every recipe JSON validates required fields", () => {
    const dir = path.join(
      process.cwd(),
      "docs/guides/viewport-lab-recipes",
    );
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json") && f !== "recipe.schema.json");
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const file of files) {
      const raw = JSON.parse(
        fs.readFileSync(path.join(dir, file), "utf8"),
      ) as {
        id: string;
        title: string;
        startUrl: string;
        steps: { action: string }[];
      };
      expect(raw.id).toBeTruthy();
      expect(raw.title).toBeTruthy();
      expect(raw.startUrl.startsWith("/viewport-lab/")).toBe(true);
      expect(raw.steps.length).toBeGreaterThan(0);
    }
  });
});
