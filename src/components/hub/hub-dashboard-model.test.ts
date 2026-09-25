import { describe, expect, it } from "vitest";
import { resolveDashboardModel } from "./hub-dashboard-model";
import type { HubModule, UserRole } from "@/types/tenant";

const enabled: HubModule[] = ["comms", "grievance", "tasks", "checkins", "portal"];

describe("Officer Hub home discovery", () => {
  it("puts a president's enabled personal work ahead of optional setup", () => {
    const model = resolveDashboardModel(["local_president"], enabled, true);
    expect(model.attention).toBe("personal");
    expect(model.isPresident).toBe(true);
    expect(model.showTasks).toBe(true);
    expect(model.showCheckins).toBe(true);
  });

  it("gives a steward only permitted, enabled work areas", () => {
    const model = resolveDashboardModel(["local_steward"], ["comms", "grievance", "tasks"], true);
    expect(model.attention).toBe("personal");
    expect(model.showCheckins).toBe(false);
    expect(model.modules.map((mod) => mod.id)).toEqual(["grievance", "tasks"]);
  });

  it("keeps host operations separate from local work for platform admins", () => {
    const model = resolveDashboardModel(["platform_admin"], enabled, true);
    expect(model.attention).toBe("platform");
    expect(model.isPresident).toBe(false);
    expect(model.showTasks).toBe(false);
    expect(model.showCheckins).toBe(false);
    expect(model.modules).toEqual([]);
  });

  it("never treats disabled modules as an empty personal workload", () => {
    const model = resolveDashboardModel(["local_president"], ["comms", "portal"], true);
    expect(model.attention).toBe("modulesOff");
    expect(model.showTasks).toBe(false);
    expect(model.showCheckins).toBe(false);
  });

  it("shows the verification step before personal summaries when MFA is required", () => {
    const model = resolveDashboardModel(["local_steward"], enabled, false);
    expect(model.attention).toBe("locked");
    expect(resolveDashboardModel(["platform_admin"], enabled, false).attention).toBe("locked");
  });

  it("does not offer private work to a member role", () => {
    const model = resolveDashboardModel(["local_member"] as UserRole[], enabled, true);
    expect(model.showTasks).toBe(false);
    expect(model.showCheckins).toBe(false);
    expect(model.modules).toEqual([]);
  });
});
