import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PORTAL_NAV_LINKS,
  circleHrefForDispatch,
  circleIdFromPath,
  circleWorkspaceTabs,
  portalCirclesMenuActive,
  portalNavLinkActive,
  sortCirclesForNav,
} from "./portal-nav-model";

const srcRoot = join(__dirname, "../..");

describe("portalNavLinkActive", () => {
  it("lights Together only on the exact /portal path", () => {
    expect(portalNavLinkActive("/portal", "/portal")).toBe(true);
    expect(portalNavLinkActive("/portal/dispatch", "/portal")).toBe(false);
    expect(portalNavLinkActive("/portal/circles/circle-hall-243", "/portal")).toBe(
      false,
    );
  });

  it("lights prefix children for the other surfaces", () => {
    expect(portalNavLinkActive("/portal/dispatch", "/portal/dispatch")).toBe(
      true,
    );
    expect(
      portalNavLinkActive("/portal/send-feedback", "/portal/send-feedback"),
    ).toBe(true);
    expect(portalNavLinkActive("/portal/fronts", "/portal/sidebars")).toBe(
      false,
    );
  });
});

describe("portalCirclesMenuActive", () => {
  it("lights Circles on workspace paths only", () => {
    expect(portalCirclesMenuActive("/portal/circles/circle-hall-243")).toBe(
      true,
    );
    expect(portalCirclesMenuActive("/portal")).toBe(false);
    expect(portalCirclesMenuActive("/portal/dispatch")).toBe(false);
  });
});

describe("circleIdFromPath", () => {
  it("reads the Circle id from a workspace path", () => {
    expect(circleIdFromPath("/portal/circles/circle-hall-243")).toBe(
      "circle-hall-243",
    );
    expect(circleIdFromPath("/portal/circles/circle-hall-243/extra")).toBe(
      "circle-hall-243",
    );
    expect(circleIdFromPath("/portal")).toBeNull();
    expect(circleIdFromPath("/portal/dispatch")).toBeNull();
  });
});

describe("circleWorkspaceTabs", () => {
  it("keeps Hall on core tools unless extras have data", () => {
    expect(
      circleWorkspaceTabs({
        kind: "local_hall",
        hasRollCall: false,
        hasPipeline: false,
        hasMomentum: false,
      }),
    ).toEqual([
      "bulletin",
      "actions",
      "calendar",
      "binder",
      "floor",
      "roster",
    ]);
  });

  it("adds Oversight on committees and only extras that exist", () => {
    expect(
      circleWorkspaceTabs({
        kind: "committee",
        hasRollCall: true,
        hasPipeline: false,
        hasMomentum: true,
      }),
    ).toEqual([
      "bulletin",
      "actions",
      "calendar",
      "binder",
      "floor",
      "rollCall",
      "momentum",
      "oversight",
      "roster",
    ]);
  });
});

describe("circleHrefForDispatch", () => {
  it("opens the Circle tool that matches the Dispatch kind", () => {
    expect(circleHrefForDispatch("circle-hall-243", "assignment")).toBe(
      "/portal/circles/circle-hall-243?tab=actions",
    );
    expect(circleHrefForDispatch("circle-hall-243", "due_soon")).toBe(
      "/portal/circles/circle-hall-243?tab=actions",
    );
    expect(circleHrefForDispatch("circle-jhsc-243", "roll_call")).toBe(
      "/portal/circles/circle-jhsc-243?tab=rollCall",
    );
    expect(circleHrefForDispatch("circle-lec-243", "pipeline")).toBe(
      "/portal/circles/circle-lec-243?tab=pipeline",
    );
    expect(circleHrefForDispatch("circle-hall-243", "mention")).toBe(
      "/portal/circles/circle-hall-243?tab=bulletin",
    );
    expect(circleHrefForDispatch("circle-hall-243", "bulletin")).toBe(
      "/portal/circles/circle-hall-243?tab=bulletin",
    );
  });
});

describe("sortCirclesForNav", () => {
  it("puts starred Circles first, then name", () => {
    const sorted = sortCirclesForNav([
      { id: "b", name: "LEC", starred: false },
      { id: "a", name: "Hall", starred: true },
      { id: "c", name: "Campaign", starred: true },
    ]);
    expect(sorted.map((c) => c.id)).toEqual(["c", "a", "b"]);
  });
});

describe("PORTAL_NAV_LINKS catalog", () => {
  it("keeps Together first and lists every chrome surface once", () => {
    expect(PORTAL_NAV_LINKS.map((l) => l.id)).toEqual([
      "station",
      "dispatch",
      "fronts",
      "sidebars",
      "feedback",
    ]);
    const hrefs = PORTAL_NAV_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("PortalNav chrome contract", () => {
  it("does not hide items behind overflow-x-auto + hidden scrollbars", () => {
    const source = readFileSync(
      join(srcRoot, "components/portal/PortalNav.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/overflow-x-auto/);
    expect(source).not.toMatch(/scrollbar-width:none/);
    expect(source).toContain("PortalNavDrawer");
    expect(source).toContain("preferredHubToolsMenuWidth");
  });

  it("sticks the portal bar below the public header height token", () => {
    const header = readFileSync(
      join(srcRoot, "components/layout/Header.tsx"),
      "utf8",
    );
    const portalNav = readFileSync(
      join(srcRoot, "components/portal/PortalNav.tsx"),
      "utf8",
    );
    expect(header).toContain("--site-header-height");
    expect(portalNav).toContain("--site-header-height");
  });
});
