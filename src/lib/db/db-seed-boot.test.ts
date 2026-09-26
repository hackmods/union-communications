import { describe, expect, it } from "vitest";
import {
  resolveSeedJsonPath,
  resolveSeedOnBootMode,
  loadReferenceTenantSeed,
  runBootSeed,
} from "../../../docker/db-seed-boot.mjs";

describe("db-seed-boot", () => {
  it("defaults SEED_ON_BOOT to auto", () => {
    expect(resolveSeedOnBootMode(undefined)).toBe("auto");
    expect(resolveSeedOnBootMode("")).toBe("auto");
    expect(resolveSeedOnBootMode("AUTO")).toBe("auto");
  });

  it("parses true / false aliases", () => {
    expect(resolveSeedOnBootMode("true")).toBe("true");
    expect(resolveSeedOnBootMode("1")).toBe("true");
    expect(resolveSeedOnBootMode("always")).toBe("true");
    expect(resolveSeedOnBootMode("false")).toBe("false");
    expect(resolveSeedOnBootMode("off")).toBe("false");
    expect(resolveSeedOnBootMode("0")).toBe("false");
  });

  it("loads the shipped B7P reference tenant JSON", () => {
    const path = resolveSeedJsonPath();
    const seed = loadReferenceTenantSeed(path);
    expect(seed.union.id).toBe("union-b7p");
    expect(seed.locals.length).toBeGreaterThan(0);
    expect(seed.bargainingUnits.length).toBeGreaterThan(0);
  });

  it("skips boot seed when disabled or no database URL is set", async () => {
    expect(await runBootSeed({ SEED_ON_BOOT: "false" })).toEqual({
      skipped: true,
      reason: "disabled",
    });
    expect(
      await runBootSeed({
        SEED_ON_BOOT: "auto",
        DATABASE_URL: "",
        MIGRATE_DATABASE_URL: "",
      }),
    ).toEqual({ skipped: true, reason: "no_database_url" });
  });
});
