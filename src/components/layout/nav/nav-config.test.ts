import { describe, expect, it } from "vitest";
import {
  getStartedHref,
  isLearnPath,
  isToolsPath,
  linkActive,
  learnGroups,
  toolGroups,
} from "./nav-config";

describe("getStartedHref", () => {
  it("points to onboarding when theme is not established", () => {
    expect(getStartedHref(false)).toBe("/onboarding");
  });

  it("points to first-week roadmap when theme is established", () => {
    expect(getStartedHref(true)).toBe("/guide/social-media-plan");
  });
});

describe("linkActive", () => {
  it("matches exact and nested tool paths, not guide/tools indexes", () => {
    expect(linkActive("/guide", "/guide")).toBe(true);
    expect(linkActive("/guide/print", "/guide")).toBe(false);
    expect(linkActive("/tools", "/tools")).toBe(true);
    expect(linkActive("/tools/flyer-maker", "/tools")).toBe(false);
    expect(linkActive("/tools/flyer-maker", "/tools/flyer-maker")).toBe(true);
    expect(linkActive("/brand-kit", "/guide")).toBe(false);
  });
});

describe("path helpers", () => {
  it("detects learn and tools paths", () => {
    expect(isLearnPath("/guide/resources")).toBe(true);
    expect(isLearnPath("/examples")).toBe(true);
    expect(isLearnPath("/tools/logo-builder")).toBe(false);
    expect(isToolsPath("/tools")).toBe(true);
    expect(isToolsPath("/tools/flyer-maker")).toBe(true);
    expect(isToolsPath("/guide")).toBe(false);
  });

  it("includes First week under Guides", () => {
    const guides = learnGroups.find((g) => g.labelKey === "learnGroupGuides");
    expect(guides?.links.some((l) => l.href === "/guide/social-media-plan")).toBe(
      true,
    );
  });

  it("keeps four tool groups", () => {
    expect(toolGroups).toHaveLength(4);
  });
});
