import { describe, expect, it } from "vitest";
import {
  getTenantContext,
  listBargainingUnitsForLocal,
  resolveGrievanceConfig,
} from "@/lib/tenant/loader";

describe("tenant loader multi-scope", () => {
  it("loads multiple locals for the reference union", () => {
    const ctx = getTenantContext("union-opseu");
    expect(ctx).not.toBeNull();
    expect(ctx!.locals.map((l) => l.localNumber)).toEqual(["243", "560"]);
    expect(ctx!.local?.localNumber).toBe("243");
    expect(ctx!.division?.code).toBe("caat");
  });

  it("lists FT and PT collections for Local 243", () => {
    const units = listBargainingUnitsForLocal("union-opseu", "local-243");
    expect(units.map((u) => u.code).sort()).toEqual(["ft", "pt"]);
  });

  it("resolves different CA deadlines for FT vs PT", () => {
    const ft = resolveGrievanceConfig("union-opseu", {
      bargainingUnitId: "bu-243-ft",
    });
    const pt = resolveGrievanceConfig("union-opseu", {
      bargainingUnitId: "bu-243-pt",
    });
    expect(ft?.steps[0].responseDays).toBe(5);
    expect(pt?.steps[0].responseDays).toBe(7);
  });

  it("falls back to union grievanceConfig", () => {
    const cfg = resolveGrievanceConfig("union-opseu");
    expect(cfg?.steps).toHaveLength(4);
  });
});
