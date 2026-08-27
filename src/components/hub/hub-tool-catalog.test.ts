import { describe, expect, it } from "vitest";
import {
  HUB_TOOL_CATALOG,
  hubToolCatalogHrefs,
  hubToolGroupHrefs,
  listVisibleHubTools,
  resolveHubToolAccess,
} from "./hub-tool-catalog";
import type { HubModule, UserRole } from "@/types/tenant";

const ALL_MODULES: HubModule[] = [
  "comms",
  "grievance",
  "bumping",
  "time",
  "discussions",
  "tasks",
  "informalLog",
  "checkins",
  "portal",
];

describe("HUB_TOOL_CATALOG", () => {
  it("covers every grouped HubNav href exactly once", () => {
    const catalog = hubToolCatalogHrefs().sort();
    const grouped = [...hubToolGroupHrefs()].sort();
    expect(catalog).toEqual(grouped);
    expect(new Set(catalog).size).toBe(catalog.length);
  });

  it("keeps a blurb key on every row", () => {
    expect(HUB_TOOL_CATALOG.every((item) => item.blurbKey)).toBe(true);
  });
});

describe("resolveHubToolAccess", () => {
  it("shows the president kit including records and funds", () => {
    const access = resolveHubToolAccess(
      ["local_president"] as UserRole[],
      ALL_MODULES,
    );
    const hrefs = listVisibleHubTools(access).map((item) => item.href);
    expect(hrefs).toContain("/app/calendar");
    expect(hrefs).toContain("/app/minutes");
    expect(hrefs).toContain("/app/ledger");
    expect(hrefs).toContain("/app/handoff");
    expect(hrefs).toContain("/app/officer-learning");
    expect(hrefs).not.toContain("/app/feedback");
  });

  it("hides elevated records from a steward", () => {
    const access = resolveHubToolAccess(
      ["local_steward"] as UserRole[],
      ALL_MODULES,
    );
    const hrefs = listVisibleHubTools(access).map((item) => item.href);
    expect(hrefs).toContain("/app/overdue");
    expect(hrefs).toContain("/app/snippets");
    expect(hrefs).not.toContain("/app/officer-learning");
    expect(hrefs).not.toContain("/app/handoff");
    expect(hrefs).not.toContain("/app/officers");
    expect(hrefs).not.toContain("/app/ledger");
  });
});
