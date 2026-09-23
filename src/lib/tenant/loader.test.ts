import { describe, expect, it } from "vitest";
import {
  getTenantContext,
  listBargainingUnitsForLocal,
  resolveGrievanceConfig,
} from "@/lib/tenant/loader";

describe("tenant loader multi-scope", () => {
  it("loads multiple locals for the B7P demo union", () => {
    const ctx = getTenantContext("union-b7p");
    expect(ctx).not.toBeNull();
    expect(ctx!.locals.map((l) => l.localNumber)).toEqual([
      "777",
      "404",
      "502",
      "1337",
    ]);
    expect(ctx!.local?.localNumber).toBe("777");
    expect(ctx!.division?.code).toBe("b7p");
  });

  it("lists FT and PT collections for Local 777", () => {
    const units = listBargainingUnitsForLocal("union-b7p", "local-7");
    expect(units.map((u) => u.code).sort()).toEqual(["ft", "pt"]);
  });

  it("lists FT and PT collections for Local 404", () => {
    const units = listBargainingUnitsForLocal("union-b7p", "local-404");
    expect(units.map((u) => u.code).sort()).toEqual(["ft", "pt"]);
  });

  it("resolves different CA deadlines for FT vs PT", () => {
    const ft = resolveGrievanceConfig("union-b7p", {
      bargainingUnitId: "bu-7-ft",
    });
    const pt = resolveGrievanceConfig("union-b7p", {
      bargainingUnitId: "bu-7-pt",
    });
    expect(ft?.steps[0].responseDays).toBe(5);
    expect(pt?.steps[0].responseDays).toBe(7);
  });

  it("falls back to union grievanceConfig", () => {
    const cfg = resolveGrievanceConfig("union-b7p");
    expect(cfg?.steps).toHaveLength(4);
  });

  it("selects the session local instead of locals[0]", () => {
    const seeded = getTenantContext("union-b7p");
    expect(seeded?.local?.localNumber).toBe("777");
    const other = getTenantContext("union-b7p", "local-1337");
    expect(other?.local?.localNumber).toBe("1337");
    expect(other?.locals.map((l) => l.localNumber)).toEqual([
      "777",
      "404",
      "502",
      "1337",
    ]);
  });
});
