import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HUB_TOOL_GROUPS,
  groupHubToolLinks,
  hubDrawerEmptyKind,
  hubDrawerHasUnionWork,
  hubShowsLocalPortalPeer,
  hubToolsActive,
} from "./hub-nav-model";

const srcRoot = join(__dirname, "../..");

describe("groupHubToolLinks", () => {
  it("keeps four job groups and drops empty ones", () => {
    expect(HUB_TOOL_GROUPS.map((g) => g.id)).toEqual([
      "casework",
      "records",
      "funds",
      "admin",
    ]);

    const grouped = groupHubToolLinks([
      { href: "/app/calendar", label: "Calendar" },
      { href: "/app/ledger", label: "Fund" },
      { href: "/app/audit", label: "Audit" },
    ]);

    expect(grouped.map((g) => g.id)).toEqual(["casework", "funds", "admin"]);
    expect(grouped[0]?.links.map((l) => l.href)).toEqual(["/app/calendar"]);
  });

  it("preserves catalog order inside a group, not caller order", () => {
    const grouped = groupHubToolLinks([
      { href: "/app/hybrid", label: "Hybrid" },
      { href: "/app/overdue", label: "Overdue" },
      { href: "/app/calendar", label: "Calendar" },
    ]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.links.map((l) => l.href)).toEqual([
      "/app/calendar",
      "/app/overdue",
      "/app/hybrid",
    ]);
  });

  it("keeps ungrouped hrefs visible instead of dropping them", () => {
    const grouped = groupHubToolLinks([
      { href: "/app/brand-new", label: "New" },
      { href: "/app/minutes", label: "Minutes" },
    ]);
    expect(grouped.map((g) => g.id)).toEqual(["records", "other"]);
    expect(grouped[1]?.links.map((l) => l.href)).toEqual(["/app/brand-new"]);
  });

  it("marks Officer tools active on a grouped child path", () => {
    const links = [{ href: "/app/officers", label: "Officers" }];
    expect(hubToolsActive("/app/officers/123", links)).toBe(true);
    expect(hubToolsActive("/app/grievances", links)).toBe(false);
  });
});

describe("hubShowsLocalPortalPeer", () => {
  it("shows Local Portal for officers when the module is on", () => {
    expect(
      hubShowsLocalPortalPeer(["portal", "grievance"], ["local_president"]),
    ).toBe(true);
  });

  it("hides Local Portal when the union has not enabled the module", () => {
    expect(hubShowsLocalPortalPeer(["grievance"], ["local_president"])).toBe(
      false,
    );
  });

  it("still shows Local Portal for members and officers — Site Admin is a separate gate", () => {
    expect(hubShowsLocalPortalPeer(["portal"], ["local_member"])).toBe(true);
    expect(hubShowsLocalPortalPeer(["portal"], ["local_president"])).toBe(true);
    expect(hubShowsLocalPortalPeer(["portal"], ["platform_admin"])).toBe(true);
  });

  it("keeps Local Portal while tenant settings have not loaded", () => {
    expect(
      hubShowsLocalPortalPeer([], ["platform_admin"], false),
    ).toBe(true);
    expect(
      hubShowsLocalPortalPeer([], ["local_president"], false),
    ).toBe(true);
  });
});

describe("hubDrawerHasUnionWork", () => {
  it("is empty for a host operator with no modules or tools", () => {
    expect(hubDrawerHasUnionWork(0, 0, 0)).toBe(false);
    expect(hubDrawerHasUnionWork(1, 0, 0)).toBe(true);
    expect(hubDrawerHasUnionWork(0, 1, 0)).toBe(true);
    expect(hubDrawerHasUnionWork(0, 0, 1)).toBe(true);
  });
});

describe("hubDrawerEmptyKind", () => {
  it("stays quiet when union destinations exist", () => {
    expect(
      hubDrawerEmptyKind({
        hasUnionWork: true,
        tenantKnown: false,
        prefersPortalHome: true,
      }),
    ).toBe("none");
  });

  it("asks host operators without a local to get an assignment", () => {
    expect(
      hubDrawerEmptyKind({
        hasUnionWork: false,
        tenantKnown: false,
        prefersPortalHome: false,
      }),
    ).toBe("noTenant");
  });

  it("sends members to Local Portal instead of promising a local assignment", () => {
    expect(
      hubDrawerEmptyKind({
        hasUnionWork: false,
        tenantKnown: true,
        prefersPortalHome: true,
      }),
    ).toBe("memberHome");
  });

  it("tells officers when modules are off for their role", () => {
    expect(
      hubDrawerEmptyKind({
        hasUnionWork: false,
        tenantKnown: true,
        prefersPortalHome: false,
      }),
    ).toBe("modulesOff");
  });
});

describe("HubNav chrome contract", () => {
  it("does not hide items behind overflow-x-auto + hidden scrollbars", () => {
    const source = readFileSync(
      join(srcRoot, "components/hub/HubNav.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/overflow-x-auto/);
    expect(source).not.toMatch(/scrollbar-width:none/);
    expect(source).toContain("HubNavDrawer");
    expect(source).toContain("preferredHubToolsMenuWidth");
    expect(source).not.toMatch(/align="right"/);
  });

  it("lists Officer tools before top-level modules so the kit is not last", () => {
    const source = readFileSync(
      join(srcRoot, "components/hub/HubNav.tsx"),
      "utf8",
    );
    const toolsIdx = source.indexOf('label={t("toolsMenu")}');
    const modulesIdx = source.indexOf("{modules.map((mod) => {");
    expect(toolsIdx).toBeGreaterThan(-1);
    expect(modulesIdx).toBeGreaterThan(-1);
    expect(toolsIdx).toBeLessThan(modulesIdx);
    expect(source).toContain("listHubToolLinks");
  });

  it("sticks the hub bar below the public header height token", () => {
    const header = readFileSync(
      join(srcRoot, "components/layout/Header.tsx"),
      "utf8",
    );
    const hubNav = readFileSync(
      join(srcRoot, "components/hub/HubNav.tsx"),
      "utf8",
    );
    const bannerStack = readFileSync(
      join(srcRoot, "components/hub/HubBannerStack.tsx"),
      "utf8",
    );
    expect(header).toContain("--site-header-height");
    expect(header).toContain("observeLiveChromeBottom");
    expect(hubNav).toContain("--site-header-height");
    expect(hubNav).toContain("observeLiveChromeBottom");
    expect(hubNav).toContain("--hub-banner-stack-height");
    expect(hubNav).toContain("--app-chrome-bottom");
    expect(bannerStack).toContain("--hub-banner-stack-height");
  });

  it("hides the public hamburger on Hub routes and shares MobileSheet", () => {
    const header = readFileSync(
      join(srcRoot, "components/layout/Header.tsx"),
      "utf8",
    );
    const hubDrawer = readFileSync(
      join(srcRoot, "components/hub/HubNavDrawer.tsx"),
      "utf8",
    );
    expect(header).toContain('shellContext === "hub"');
    expect(header).toContain("hidePublicHamburger");
    expect(hubDrawer).toContain("MobileSheet");
    expect(hubDrawer).toContain("MobileSiteSection");
    expect(hubDrawer).toContain("portalHref");
    expect(hubDrawer).toContain("hub-workspace-peers");
    expect(hubDrawer).toContain("hub-home-peer");
    expect(hubDrawer).toContain("hub-portal-peer");
    expect(hubDrawer).toContain("showOperatorChrome");
    expect(hubDrawer).toContain("contextReady");
    expect(hubDrawer).toContain("emptyKind");
    expect(hubDrawer).toContain("hub-operator-peer");
    expect(hubDrawer).toContain('excludeKeys={["platform"]}');
    expect(hubDrawer).not.toContain("PlatformOperatorAccountLinks");
    const sheet = readFileSync(
      join(srcRoot, "components/layout/nav/MobileSheet.tsx"),
      "utf8",
    );
    expect(sheet).toContain("min-w-0");
    expect(sheet).toContain("max-w-full");
    expect(sheet).not.toContain("100vw");
    expect(sheet).toContain("clampMobileSheetToViewport");
    expect(sheet).toContain("readLayoutViewportWidth");
    expect(sheet).toContain("isMobileSheetSidePanel");
  });

  it("does not put Send feedback on the hub bar (footer / Support still have it)", () => {
    const source = readFileSync(
      join(srcRoot, "components/hub/HubNav.tsx"),
      "utf8",
    );
    expect(source).not.toContain("/app/send-feedback");
    expect(source).not.toContain("sendFeedbackLink");
  });

  it("gates the context pipe on useHubContextReady and does not invent modules", () => {
    const source = readFileSync(
      join(srcRoot, "components/hub/HubNav.tsx"),
      "utf8",
    );
    expect(source).toContain("useHubContextReady");
    expect(source).toContain("contextReady");
    expect(source).not.toContain("PRESIDENT_OVERLAY_MODULES");
    expect(source).toContain("tenant?.union.enabledModules ?? []");
    expect(source).toContain("isHubSetupToolHref");
    expect(source).toContain("setupLinks");
    expect(source).toContain("menuToolLinks");
    expect(source).toContain("hubShowsLocalPortalPeer");
    expect(source).toContain("Boolean(tenant)");
    expect(source).toContain("contextReady");
    expect(source).toContain("showOperatorChrome");
    expect(source).toContain("emptyKind");
    expect(source).toContain("prefersPortalHome");
    expect(source).toContain('t("portalLink")');
    expect(source).toContain("isPlatformOperator");
    expect(source).toContain("PlatformOperatorNavDropdown");
  });
});
