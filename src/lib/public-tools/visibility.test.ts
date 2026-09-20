import { describe, expect, it } from "vitest";
import {
  resolvePublicToolEnabled,
  slugFromToolHref,
  GATEABLE_PUBLIC_TOOL_SLUGS,
} from "./visibility";

describe("resolvePublicToolEnabled", () => {
  it("defaults to enabled", () => {
    expect(
      resolvePublicToolEnabled("bylaw-builder", { platformDisabled: [] }),
    ).toBe(true);
  });

  it("respects platform kill-switch first", () => {
    expect(
      resolvePublicToolEnabled("bylaw-builder", {
        platformDisabled: ["bylaw-builder"],
        unionDisabled: [],
        localDisabled: [],
      }),
    ).toBe(false);
  });

  it("applies union then local overlays", () => {
    expect(
      resolvePublicToolEnabled("proposal-tracker", {
        platformDisabled: [],
        unionDisabled: ["proposal-tracker"],
      }),
    ).toBe(false);
    expect(
      resolvePublicToolEnabled("flyer-maker", {
        platformDisabled: [],
        unionDisabled: [],
        localDisabled: ["flyer-maker"],
      }),
    ).toBe(false);
  });

  it("lists gateable public tools without pulse-poll", () => {
    expect(GATEABLE_PUBLIC_TOOL_SLUGS).toContain("bylaw-builder");
    expect(GATEABLE_PUBLIC_TOOL_SLUGS).toContain("proposal-tracker");
    expect(GATEABLE_PUBLIC_TOOL_SLUGS).not.toContain("pulse-poll");
  });
});

describe("slugFromToolHref", () => {
  it("parses tool paths", () => {
    expect(slugFromToolHref("/tools/bylaw-builder")).toBe("bylaw-builder");
    expect(slugFromToolHref("/tools/proposal-tracker?x=1")).toBe(
      "proposal-tracker",
    );
    expect(slugFromToolHref("/guide/bylaws")).toBeNull();
  });
});
