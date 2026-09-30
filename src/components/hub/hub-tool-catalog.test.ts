import { describe, expect, it } from "vitest";
import {
  HUB_TOOL_CATALOG,
  hubToolCatalogHrefs,
  hubToolGroupHrefs,
  listVisibleHubTools,
  resolveHubToolAccess,
} from "./hub-tool-catalog";
import type { HubModule, UserRole } from "@/types/tenant";
import type { PresidentRoleToolId } from "@/lib/president/module-catalog";

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

const ALL_ROLE_TOOLS: PresidentRoleToolId[] = [
  "financialSummaries",
  "invites",
  "meetings",
  "broadcast",
  "polls",
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

  it("does not list expenses or travel (Hub modules, not role tools)", () => {
    const hrefs = hubToolCatalogHrefs();
    expect(hrefs).not.toContain("/app/expenses");
    expect(hrefs).not.toContain("/app/travel");
  });
});

describe("resolveHubToolAccess", () => {
  const scoped = {
    unionId: "u1",
    localId: "l1",
    presidentRoleTools: ALL_ROLE_TOOLS,
  };

  it("shows the president kit including records and funds", () => {
    const access = resolveHubToolAccess(
      ["local_president"] as UserRole[],
      ALL_MODULES,
      scoped,
    );
    const hrefs = listVisibleHubTools(access).map((item) => item.href);
    expect(hrefs).toContain("/app/calendar");
    expect(hrefs).toContain("/app/minutes");
    expect(hrefs).toContain("/app/ledger");
    expect(hrefs).toContain("/app/handoff");
    expect(hrefs).toContain("/app/officer-learning");
    expect(hrefs).toContain("/app/configuration");
    expect(hrefs).not.toContain("/app/feedback");
  });

  it("hides role tools when the president toggles them off", () => {
    const access = resolveHubToolAccess(
      ["local_president"] as UserRole[],
      ALL_MODULES,
      { unionId: "u1", localId: "l1", presidentRoleTools: [] },
    );
    const hrefs = listVisibleHubTools(access).map((item) => item.href);
    expect(hrefs).not.toContain("/app/ledger");
    expect(hrefs).not.toContain("/app/meetings");
    expect(hrefs).not.toContain("/app/invites");
    expect(hrefs).not.toContain("/app/broadcast");
    expect(hrefs).not.toContain("/app/polls");
    expect(hrefs).toContain("/app/configuration");
  });

  it("hides elevated records from a steward", () => {
    const access = resolveHubToolAccess(
      ["local_steward"] as UserRole[],
      ALL_MODULES,
      scoped,
    );
    const hrefs = listVisibleHubTools(access).map((item) => item.href);
    expect(hrefs).toContain("/app/overdue");
    expect(hrefs).toContain("/app/steward-guides");
    expect(hrefs).toContain("/app/snippets");
    expect(hrefs).not.toContain("/app/officer-learning");
    expect(hrefs).not.toContain("/app/handoff");
    expect(hrefs).not.toContain("/app/officers");
    expect(hrefs).not.toContain("/app/ledger");
  });

  it("hides grievance casework when the grievance module is off", () => {
    const access = resolveHubToolAccess(
      ["local_president"] as UserRole[],
      ["comms", "discussions", "portal"] as HubModule[],
      scoped,
    );
    const hrefs = listVisibleHubTools(access).map((item) => item.href);
    expect(hrefs).not.toContain("/app/calendar");
    expect(hrefs).not.toContain("/app/overdue");
    expect(hrefs).not.toContain("/app/snippets");
    expect(hrefs).not.toContain("/app/hybrid");
    expect(hrefs).toContain("/app/configuration");
    expect(hrefs).toContain("/app/invites");
    expect(hrefs).toContain("/app/minutes");
  });

  it("keeps calendar when bumping is on even if grievance is off", () => {
    const access = resolveHubToolAccess(
      ["local_president"] as UserRole[],
      ["bumping"] as HubModule[],
      scoped,
    );
    const hrefs = listVisibleHubTools(access).map((item) => item.href);
    expect(hrefs).toContain("/app/calendar");
    expect(hrefs).not.toContain("/app/overdue");
  });

  it("does not surface expenses or travel via president role tools when Hub modules are on", () => {
    const access = resolveHubToolAccess(
      ["local_president"] as UserRole[],
      [...ALL_MODULES, "expenses", "travel"] as HubModule[],
      scoped,
    );
    const hrefs = listVisibleHubTools(access).map((item) => item.href);
    expect(hrefs).not.toContain("/app/expenses");
    expect(hrefs).not.toContain("/app/travel");
  });

  it("hides local-scoped tools when the session has no union or local", () => {
    const access = resolveHubToolAccess(
      ["local_president"] as UserRole[],
      ALL_MODULES,
      { presidentRoleTools: ["invites"] },
    );
    const hrefs = listVisibleHubTools(access).map((item) => item.href);
    expect(hrefs).not.toContain("/app/officers");
    expect(hrefs).not.toContain("/app/meetings");
    expect(hrefs).not.toContain("/app/minutes");
    expect(hrefs).toContain("/app/invites");
    expect(hrefs).toContain("/app/configuration");
  });
});
