import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { DEFAULT_USER_PREFERENCES } from "@/types/preferences";
import { stampRoster } from "@/lib/org-chart";
import { emptyWebsiteDraft } from "@/types/website-draft";
import {
  LOCAL_PACK_KIND,
  LOCAL_PACK_VERSION,
  buildLocalPack,
  localPackFilename,
  migrateLocalPackV1,
  parseLocalPack,
  parseLocalPackText,
  serializeLocalPack,
} from "./index";

describe("local pack", () => {
  const roster = stampRoster([
    {
      id: "p1",
      name: "Ada",
      role: "President",
      location: "",
      group: "executive",
      showOnWebsite: true,
    },
  ]);

  it("serializes and parses a full v1 pack", () => {
    const pack = buildLocalPack({
      brandKit: DEFAULT_BRAND_KIT,
      publicRoster: roster,
      preferences: DEFAULT_USER_PREFERENCES,
      onboardingComplete: true,
      websiteDraft: emptyWebsiteDraft({
        unionName: "Local 7",
        heroText: "Hello",
        officersOverride: false,
      }),
      exportedAt: "2026-09-24T00:00:00.000Z",
    });

    expect(pack.kind).toBe(LOCAL_PACK_KIND);
    expect(pack.version).toBe(LOCAL_PACK_VERSION);

    const parsed = parseLocalPackText(serializeLocalPack(pack));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.pack.brandKit?.local.localNumber).toBe(
      DEFAULT_BRAND_KIT.local.localNumber,
    );
    expect(parsed.pack.publicRoster?.people[0]?.name).toBe("Ada");
    expect(parsed.pack.websiteDraft?.unionName).toBe("Local 7");
    expect(parsed.pack.onboardingComplete).toBe(true);
  });

  it("rejects wrong kind and empty packs", () => {
    expect(parseLocalPack({ kind: "unionops-website", version: 1 })).toEqual({
      ok: false,
      code: "wrongKind",
    });
    expect(
      parseLocalPack({
        kind: LOCAL_PACK_KIND,
        version: LOCAL_PACK_VERSION,
        exportedAt: "2026-09-24T00:00:00.000Z",
      }),
    ).toEqual({ ok: false, code: "empty" });
  });

  it("rejects unsupported versions", () => {
    expect(
      parseLocalPack({
        kind: LOCAL_PACK_KIND,
        version: 99,
        brandKit: DEFAULT_BRAND_KIT,
      }),
    ).toEqual({ ok: false, code: "unsupportedVersion" });
  });

  it("allows partial packs and leaves missing sections undefined", () => {
    const parsed = parseLocalPack({
      kind: LOCAL_PACK_KIND,
      version: 1,
      exportedAt: "2026-09-24T00:00:00.000Z",
      publicRoster: roster,
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.pack.brandKit).toBeUndefined();
    expect(parsed.pack.publicRoster?.people).toHaveLength(1);
  });

  it("flags invalid sections without applying others blindly", () => {
    const parsed = parseLocalPack({
      kind: LOCAL_PACK_KIND,
      version: 1,
      brandKit: { nope: true },
      publicRoster: roster,
    });
    expect(parsed).toEqual({
      ok: false,
      code: "invalidSection",
      detail: "brandKit",
    });
  });

  it("exposes an identity v1 migrator for future chaining", () => {
    const migrated = migrateLocalPackV1({
      kind: LOCAL_PACK_KIND,
      version: 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(migrated.version).toBe(LOCAL_PACK_VERSION);
    expect(migrated.exportedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("builds a stable download filename", () => {
    expect(localPackFilename("243")).toBe("local-243-local-pack.json");
  });
});
