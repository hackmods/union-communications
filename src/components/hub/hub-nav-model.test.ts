import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HUB_TOOL_GROUPS,
  groupHubToolLinks,
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
    expect(header).toContain("--site-header-height");
    expect(hubNav).toContain("--site-header-height");
  });

  it("does not put Send feedback on the hub bar (footer / Support still have it)", () => {
    const source = readFileSync(
      join(srcRoot, "components/hub/HubNav.tsx"),
      "utf8",
    );
    expect(source).not.toContain("/app/send-feedback");
    expect(source).not.toContain("sendFeedbackLink");
  });
});
