import { describe, expect, it } from "vitest";
import {
  getStartedHref,
  isLearnPath,
  isToolsPath,
  linkActive,
  learnGroups,
  PULSE_POLL_HREF,
  toolGroups,
  visibleToolGroups,
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
    expect(isLearnPath("/assets")).toBe(true);
    expect(isLearnPath("/manifesto")).toBe(true);
    expect(isLearnPath("/install")).toBe(true);
    expect(isLearnPath("/tools/logo-builder")).toBe(false);
    expect(isToolsPath("/tools")).toBe(true);
    expect(isToolsPath("/tools/flyer-maker")).toBe(true);
    expect(isToolsPath("/guide")).toBe(false);
  });

  it("orders Start here as Blueprint, First week, then Comms Resources", () => {
    const guides = learnGroups.find((g) => g.labelKey === "learnGroupGuides");
    expect(guides?.links.map((l) => l.href)).toEqual([
      "/guide",
      "/guide/social-media-plan",
      "/guide/resources",
      "/guide/workshop",
      "/guide/crisis",
    ]);
  });

  it("puts Membership signup under By channel and Photo Consent under Libraries", () => {
    const channels = learnGroups.find(
      (g) => g.labelKey === "learnGroupChannels",
    );
    const libraries = learnGroups.find(
      (g) => g.labelKey === "learnGroupLibraries",
    );
    expect(channels?.links.map((l) => l.href)).toEqual([
      "/guide/print",
      "/guide/union-boards",
      "/guide/website",
      "/guide/email-broadcast",
      "/guide/membership-signup",
    ]);
    expect(libraries?.links.map((l) => l.href)).toEqual([
      "/examples",
      "/captions",
      "/guide/photo-consent",
    ]);
  });

  it("includes About group with assets manifesto install", () => {
    const about = learnGroups.find((g) => g.labelKey === "learnGroupAbout");
    expect(about?.links.map((l) => l.href)).toEqual([
      "/assets",
      "/manifesto",
      "/install",
    ]);
  });
});

describe("toolGroups", () => {
  it("keeps four job-based tool groups", () => {
    expect(toolGroups.map((g) => g.labelKey)).toEqual([
      "toolsGroupBrand",
      "toolsGroupBoards",
      "toolsGroupPrint",
      "toolsGroupSocialWeb",
    ]);
    expect(
      toolGroups.find((g) => g.labelKey === "toolsGroupBoards")?.links.map(
        (l) => l.href,
      ),
    ).toEqual([
      "/tools/board-banner",
      "/tools/board-notice",
      "/tools/solidarity-poster",
      "/tools/qr-board",
    ]);
    expect(
      toolGroups.find((g) => g.labelKey === "toolsGroupPrint")?.links.map(
        (l) => l.href,
      ),
    ).toEqual([
      "/tools/flyer-maker",
      "/tools/qr-card",
      "/tools/action-card",
      PULSE_POLL_HREF,
    ]);
    expect(
      toolGroups
        .find((g) => g.labelKey === "toolsGroupSocialWeb")
        ?.links.map((l) => l.href),
    ).toEqual([
      "/tools/graphic-maker",
      "/tools/quote-card",
      "/tools/meeting-background",
      "/tools/website-template",
      "/tools/alt-text",
    ]);
  });
});

describe("visibleToolGroups", () => {
  it("includes Pulse Poll only when hub login is on and the user is signed in", () => {
    const hrefs = (opts: {
      officerHubPublic: boolean;
      authenticated: boolean;
    }) =>
      visibleToolGroups(opts).flatMap((g) => g.links.map((l) => l.href));

    expect(
      hrefs({ officerHubPublic: true, authenticated: true }),
    ).toContain(PULSE_POLL_HREF);
    expect(
      hrefs({ officerHubPublic: true, authenticated: false }),
    ).not.toContain(PULSE_POLL_HREF);
    expect(
      hrefs({ officerHubPublic: false, authenticated: true }),
    ).not.toContain(PULSE_POLL_HREF);
    expect(
      hrefs({ officerHubPublic: false, authenticated: false }),
    ).not.toContain(PULSE_POLL_HREF);

    const printAnon = visibleToolGroups({
      officerHubPublic: false,
      authenticated: false,
    }).find((g) => g.labelKey === "toolsGroupPrint");
    expect(printAnon?.links.map((l) => l.href)).toEqual([
      "/tools/flyer-maker",
      "/tools/qr-card",
      "/tools/action-card",
    ]);
  });
});
