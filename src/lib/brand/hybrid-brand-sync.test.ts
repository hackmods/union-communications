import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  resetCommsPresetCatalogForTests,
  resolveCommsPreset,
  upsertDurableCommsPreset,
  listMergedCommsPresets,
  archiveDurableCommsPreset,
  isTrustedCommsPresetId,
} from "@/lib/brand/comms-preset-catalog";
import {
  findPresetBinding,
  resetPresetBindingsForTests,
  upsertPresetBinding,
} from "@/lib/brand/preset-bindings-store";
import {
  __setBaselineSeedPatchForTests,
  isBrandBaselineAutoSeedEnabled,
  resetBaselineEmptySeedForTests,
  trySeedBrandBaselinePatch,
} from "@/lib/brand/baseline-empty-seed";
import {
  resetHubSettingsStoreForTests,
  resolveHubBrandKit,
  writeHubBrandKit,
  getLocalBrandKit,
} from "@/lib/hub-settings/store";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { normalizeBrandKit } from "@/lib/utils/local-links";

describe("comms preset catalog", () => {
  beforeEach(() => {
    resetCommsPresetCatalogForTests();
  });
  afterEach(() => {
    resetCommsPresetCatalogForTests();
  });

  it("falls back to compiled UNION_PRESETS", () => {
    const resolved = resolveCommsPreset("opseu");
    expect(resolved?.source).toBe("compiled");
    expect(resolved?.compiled.id).toBe("opseu");
    expect(isTrustedCommsPresetId("opseu")).toBe(true);
    expect(isTrustedCommsPresetId("not-a-real-preset")).toBe(false);
  });

  it("prefers durable non-archived presets", () => {
    upsertDurableCommsPreset({
      id: "custom-local",
      name: "Custom Local",
      primaryColor: "#ABCDEF",
      secondaryColor: "#FFFFFF",
      accentColor: "#123456",
      defaultSlogans: ["Together"],
      updatedBy: "admin-1",
    });
    const resolved = resolveCommsPreset("custom-local");
    expect(resolved?.source).toBe("durable");
    expect(resolved?.compiled.primaryColor).toBe("#ABCDEF");
    expect(listMergedCommsPresets().some((p) => p.id === "custom-local")).toBe(
      true,
    );

    archiveDurableCommsPreset("custom-local", "admin-1");
    expect(resolveCommsPreset("custom-local")).toBeNull();
  });
});

describe("preset bindings store", () => {
  beforeEach(() => {
    resetPresetBindingsForTests();
  });
  afterEach(() => {
    resetPresetBindingsForTests();
  });

  it("resolves published binding by union and sector", () => {
    upsertPresetBinding({
      presetId: "opseu",
      sectorId: "caat-support",
      unionId: "union-b7p",
      scopeId: "union-b7p",
      updatedBy: "admin-1",
    });
    const hit = findPresetBinding({
      unionId: "union-b7p",
      sectorId: "caat-support",
    });
    expect(hit?.presetId).toBe("opseu");
    expect(hit?.sectorId).toBe("caat-support");
  });
});

describe("baseline empty seed", () => {
  beforeEach(() => {
    resetBaselineEmptySeedForTests();
  });
  afterEach(() => {
    resetBaselineEmptySeedForTests();
    delete process.env.BRAND_BASELINE_AUTO_SEED;
  });

  it("is disabled by default", () => {
    expect(isBrandBaselineAutoSeedEnabled({})).toBe(false);
    expect(trySeedBrandBaselinePatch({ unionId: "u1" }, {})).toBeNull();
  });

  it("returns patch when enabled and test payload set", () => {
    process.env.BRAND_BASELINE_AUTO_SEED = "true";
    __setBaselineSeedPatchForTests({
      primaryColor: "#112233",
      secondaryColor: "#445566",
      accentColor: "#778899",
    });
    const patch = trySeedBrandBaselinePatch({ unionId: "u1" });
    expect(patch?.primaryColor).toBe("#112233");
  });
});

describe("hybrid hub brand resolve", () => {
  beforeEach(() => {
    resetHubSettingsStoreForTests();
    resetCommsPresetCatalogForTests();
    resetPresetBindingsForTests();
    resetBaselineEmptySeedForTests();
  });
  afterEach(() => {
    resetHubSettingsStoreForTests();
    resetCommsPresetCatalogForTests();
    resetPresetBindingsForTests();
    resetBaselineEmptySeedForTests();
  });

  it("returns ephemeral seed without persisting Local shared", async () => {
    const first = await resolveHubBrandKit({
      userId: "president",
      unionId: "union-b7p",
      localId: "local-7",
      roles: ["local_president"],
    });
    expect(first.brandKit).not.toBeNull();
    expect(first.source?.hasLocalShared).toBe(false);
    expect(await getLocalBrandKit("union-b7p", "local-7")).toBeNull();

    await writeHubBrandKit(
      {
        userId: "president",
        unionId: "union-b7p",
        localId: "local-7",
        roles: ["local_president"],
      },
      {
        scope: "personal",
        brandKit: {
          ...first.brandKit!,
          signatureName: "President Only",
          primaryColor: "#FF00AA",
        },
      },
    );

    const steward = await resolveHubBrandKit({
      userId: "steward",
      unionId: "union-b7p",
      localId: "local-7",
      roles: ["local_steward"],
    });
    expect(steward.brandKit?.signatureName).toBeUndefined();
    expect(steward.brandKit?.primaryColor).not.toBe("#FF00AA");
    expect(steward.source?.hasLocalShared).toBe(false);

    await writeHubBrandKit(
      {
        userId: "president",
        unionId: "union-b7p",
        localId: "local-7",
        roles: ["local_president"],
      },
      {
        scope: "local",
        brandKit: {
          ...first.brandKit!,
          primaryColor: "#00AAFF",
          local: { ...first.brandKit!.local, localNumber: "7" },
        },
      },
    );

    expect(await getLocalBrandKit("union-b7p", "local-7")).not.toBeNull();

    const stewardAfterPublish = await resolveHubBrandKit({
      userId: "steward",
      unionId: "union-b7p",
      localId: "local-7",
      roles: ["local_steward"],
    });
    expect(stewardAfterPublish.brandKit?.primaryColor).toBe("#00AAFF");
    expect(stewardAfterPublish.source?.hasLocalShared).toBe(true);
  });

  it("rejects local publish for stewards", async () => {
    await expect(
      writeHubBrandKit(
        {
          userId: "steward",
          unionId: "union-b7p",
          localId: "local-7",
          roles: ["local_steward"],
        },
        {
          scope: "local",
          brandKit: normalizeBrandKit({
            ...DEFAULT_BRAND_KIT,
            primaryColor: "#111111",
          }),
        },
      ),
    ).rejects.toThrow("forbidden_local_write");
  });
});
