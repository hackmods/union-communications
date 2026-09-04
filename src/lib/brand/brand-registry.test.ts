import { describe, expect, it } from "vitest";
import {
  IDENTITY_PACKS,
  OPSEU_CAAT_A_PACK_ID,
  OPSEU_CAAT_S_PACK_ID,
  OPSEU_NATIONAL_PACK_ID,
  listLooksForContext,
  listOpseuSectorIds,
  listUnionPresetIds,
  resolveDualIdentityLooks,
  resolveLook,
} from "@/lib/brand/brand-registry";

describe("brand-registry", () => {
  it("re-exports identity packs without duplicating rows", () => {
    expect(IDENTITY_PACKS.length).toBeGreaterThanOrEqual(3);
    expect(resolveLook(OPSEU_CAAT_A_PACK_ID)?.id).toBe(OPSEU_CAAT_A_PACK_ID);
  });

  it("lists CAAT-A Look for College Faculty sector", () => {
    const looks = listLooksForContext("opseu", "caat-academic");
    expect(looks.map((p) => p.id)).toEqual([
      OPSEU_NATIONAL_PACK_ID,
      OPSEU_CAAT_A_PACK_ID,
    ]);
  });

  it("lists CAAT-S Look for College Support sector", () => {
    const looks = listLooksForContext("opseu", "caat-support");
    expect(looks.map((p) => p.id)).toContain(OPSEU_CAAT_S_PACK_ID);
  });

  it("resolves dual identity for joint bargaining", () => {
    const pair = resolveDualIdentityLooks(
      OPSEU_CAAT_A_PACK_ID,
      OPSEU_NATIONAL_PACK_ID,
    );
    expect(pair?.local.id).toBe(OPSEU_CAAT_A_PACK_ID);
    expect(pair?.coalition.id).toBe(OPSEU_NATIONAL_PACK_ID);
  });

  it("lists preset and sector ids for agents", () => {
    expect(listUnionPresetIds()).toContain("opseu");
    expect(listOpseuSectorIds()).toContain("caat-academic");
  });
});
