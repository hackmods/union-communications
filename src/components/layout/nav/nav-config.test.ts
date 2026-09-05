import { describe, expect, it } from "vitest";
import {
  getStartedHref,
  isLearnPath,
  isOfficerLearningPath,
  isToolsPath,
  linkActive,
  learnGroups,
  OFFICER_LEARNING_HREF,
  PULSE_POLL_HREF,
  toolGroups,
  visibleToolGroups,
  flatNavLinks,
} from "./nav-config";
import {
  GUIDE_CATALOG_PATH,
  GUIDE_JOB_GROUP_HREFS,
  GUIDE_NAV_STEWARD_CRAFT_HREFS,
} from "@/lib/comms/guide-registry";

describe("getStartedHref", () => {
  it("points at the Home toolkit chooser", () => {
    expect(getStartedHref()).toBe("/#toolkit");
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
    expect(isLearnPath("/manifesto")).toBe(false);
    expect(isLearnPath("/updates")).toBe(false);
    expect(isLearnPath("/install")).toBe(false);
    expect(isLearnPath(GUIDE_CATALOG_PATH)).toBe(true);
    expect(isLearnPath("/guide/grievance-process")).toBe(true);
    expect(isLearnPath(OFFICER_LEARNING_HREF)).toBe(false);
    expect(isLearnPath("/guide/officer-learning/contract-enforcement")).toBe(
      false,
    );
    expect(isOfficerLearningPath(OFFICER_LEARNING_HREF)).toBe(true);
    expect(
      isOfficerLearningPath("/guide/officer-learning/contract-enforcement"),
    ).toBe(true);
    expect(isLearnPath("/tools/logo-builder")).toBe(false);
    expect(isToolsPath("/tools")).toBe(true);
    expect(isToolsPath("/tools/flyer-maker")).toBe(true);
    expect(isToolsPath("/guide")).toBe(false);
  });

  it("orders Comms as First week, Blueprint, Workshop", () => {
    const guides = learnGroups.find((g) => g.labelKey === "learnGroupGuides");
    expect(guides?.links.map((l) => l.href)).toEqual([
      "/guide/social-media-plan",
      "/guide",
      "/guide/workshop",
    ]);
  });

  it("keeps five guide groups with floor and local after steward craft", () => {
    expect(learnGroups.map((g) => g.labelKey)).toEqual([
      "learnGroupGuides",
      "learnGroupChannels",
      "learnGroupStewardTraining",
      "learnGroupFloorLocal",
      "learnGroupLibraries",
    ]);
  });

  it("leads steward craft with the playbooks hub and crisis", () => {
    const steward = learnGroups.find(
      (g) => g.labelKey === "learnGroupStewardTraining",
    );
    const channels = learnGroups.find(
      (g) => g.labelKey === "learnGroupChannels",
    );
    expect(steward?.links.map((l) => l.href)).toEqual([
      ...GUIDE_NAV_STEWARD_CRAFT_HREFS,
    ]);
    expect(channels?.links.map((l) => l.href)).toEqual([
      "/guide/print",
      "/guide/union-boards",
      "/guide/website",
      "/guide/email-broadcast",
      "/guide/short-form",
    ]);
  });

  it("groups floor and local playbooks as nested mega-menu subgroups", () => {
    const floorLocal = learnGroups.find(
      (g) => g.labelKey === "learnGroupFloorLocal",
    );
    expect(floorLocal?.links).toEqual([]);
    expect(floorLocal?.subgroups?.map((s) => s.labelKey)).toEqual([
      "learnSubgroupFloor",
      "learnSubgroupLocal",
    ]);
    expect(floorLocal?.subgroups?.[0]?.links.map((l) => l.href)).toEqual([
      ...GUIDE_JOB_GROUP_HREFS.floor,
    ]);
    expect(floorLocal?.subgroups?.[1]?.links.map((l) => l.href)).toEqual([
      ...GUIDE_JOB_GROUP_HREFS.local,
    ]);
    const allGuideHrefs = flatNavLinks(learnGroups).map((l) => l.href);
    expect(allGuideHrefs).toContain("/guide/grievance-process");
    expect(allGuideHrefs).toContain("/guide/dfr");
    expect(allGuideHrefs).toContain("/guide/bylaws");
    expect(allGuideHrefs).toContain("/guide/membership-signup");
    expect(allGuideHrefs).not.toContain("/manifesto");
    expect(allGuideHrefs).not.toContain("/install");
  });

  it("keeps libraries without the footer About links", () => {
    const libraries = learnGroups.find(
      (g) => g.labelKey === "learnGroupLibraries",
    );
    expect(libraries?.links.map((l) => l.href)).toEqual([
      "/examples",
      "/captions",
      "/guide/photo-consent",
      "/assets",
      "/guide/resources",
    ]);
    expect(learnGroups.map((g) => g.labelKey)).not.toContain(
      "learnGroupAbout",
    );
  });
});

describe("toolGroups", () => {
  it("keeps five job-based tool groups", () => {
    expect(toolGroups.map((g) => g.labelKey)).toEqual([
      "toolsGroupBrand",
      "toolsGroupBoards",
      "toolsGroupPrint",
      "toolsGroupSocialWeb",
      "toolsGroupStewardWorksheets",
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
      "/tools/org-chart",
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
    expect(
      toolGroups
        .find((g) => g.labelKey === "toolsGroupStewardWorksheets")
        ?.links.map((l) => l.href),
    ).toEqual([
      "/tools/rtw-accommodation",
      "/tools/pre-disciplinary-log",
      "/tools/complaint-vs-grievance",
      "/tools/bylaw-builder",
      "/tools/proposal-tracker",
      "/tools/rules-of-order",
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
