import { describe, expect, it, beforeEach } from "vitest";
import {
  applyPersistedSnapshotToOverlay,
  setUnionBrandTheme,
  setUnionCommsPresetId,
  tenantsPostgresEnabled,
  updateUnionSlug,
} from "@/lib/tenant/persist";
import { findLocalByNumber, getTenantByUnionId } from "@/lib/tenant/loader";
import {
  createOverlayUnion,
  resetTenantOverlayForTests,
} from "@/lib/tenant/overlay";

describe("tenantsPostgresEnabled", () => {
  it("requires DATABASE_URL", () => {
    expect(tenantsPostgresEnabled({})).toBe(false);
    expect(
      tenantsPostgresEnabled({ DATABASE_URL: "postgres://localhost/unionops" }),
    ).toBe(true);
  });
});

describe("applyPersistedSnapshotToOverlay", () => {
  beforeEach(() => {
    resetTenantOverlayForTests();
  });

  it("merges a new local onto the reference union without replacing seed locals", () => {
    applyPersistedSnapshotToOverlay({
      unions: [
        {
          id: "union-b7p",
          name: "Behind 7 Proxies",
          slug: "b7p",
          defaultLocale: "en",
          enabledModules: ["comms", "portal"],
        },
      ],
      divisions: [],
      locals: [
        {
          id: "local-778",
          unionId: "union-b7p",
          localNumber: "778",
          subText: "Pilot local",
        },
      ],
      bargainingUnits: [
        {
          id: "bu-778-ft",
          unionId: "union-b7p",
          localId: "local-778",
          code: "ft",
          name: "Full-time",
        },
      ],
    });
    expect(findLocalByNumber("union-b7p", "777")?.id).toBe("local-7");
    expect(findLocalByNumber("union-b7p", "778")?.subText).toBe("Pilot local");
    const ctx = getTenantByUnionId("union-b7p");
    expect(ctx?.bargainingUnits?.some((u) => u.id === "bu-778-ft")).toBe(true);
    expect(ctx?.brandDefaults.assetPackPath ?? "").not.toContain("caat-opseu");
  });

  it("imports a new union with host brand defaults, not OPSEU assets", () => {
    applyPersistedSnapshotToOverlay({
      unions: [
        {
          id: "union-example",
          name: "Example Workers",
          slug: "example-wu",
          defaultLocale: "en",
          enabledModules: ["comms", "grievance", "portal"],
        },
      ],
      divisions: [],
      locals: [
        {
          id: "local-ex-1",
          unionId: "union-example",
          localNumber: "1",
          subText: "",
        },
      ],
      bargainingUnits: [],
    });
    const seed = getTenantByUnionId("union-example");
    expect(seed?.union.name).toBe("Example Workers");
    expect(seed?.brandDefaults.assetPackPath).not.toContain("caat-opseu");
    expect(seed?.locals?.[0]?.localNumber).toBe("1");
  });

  it("is idempotent when the same local is applied twice", () => {
    const local = {
      id: "local-888",
      unionId: "union-b7p",
      localNumber: "888",
      subText: "Once",
    };
    applyPersistedSnapshotToOverlay({
      unions: [],
      divisions: [],
      locals: [local],
      bargainingUnits: [],
    });
    applyPersistedSnapshotToOverlay({
      unions: [],
      divisions: [],
      locals: [local],
      bargainingUnits: [],
    });
    const matches =
      getTenantByUnionId("union-b7p")?.locals?.filter(
        (row) => row.id === "local-888",
      ) ?? [];
    expect(matches).toHaveLength(1);
  });
});

describe("overlay union defaults", () => {
  beforeEach(() => {
    resetTenantOverlayForTests();
  });

  it("enables president executive modules and leaves Workforce Time off", () => {
    const seed = createOverlayUnion({ name: "Example Workers Union" });
    expect(seed.union.enabledModules).toEqual(
      expect.arrayContaining([
        "comms",
        "grievance",
        "discussions",
        "bylaws",
        "proposals",
        "portal",
      ]),
    );
    expect(seed.union.enabledModules).not.toContain("time");
  });
});

describe("union brand persist (memory)", () => {
  beforeEach(() => {
    resetTenantOverlayForTests();
    delete process.env.DATABASE_URL;
  });

  it("binds and clears a Comms preset without hitting Postgres", async () => {
    expect(await setUnionCommsPresetId("union-b7p", "unifor")).toEqual({
      ok: true,
    });
    expect(getTenantByUnionId("union-b7p")?.brandDefaults.commsPresetId).toBe(
      "unifor",
    );

    expect(await setUnionCommsPresetId("union-b7p", null)).toEqual({ ok: true });
    expect(
      getTenantByUnionId("union-b7p")?.brandDefaults.commsPresetId,
    ).toBeUndefined();
  });

  it("rejects an invalid theme and stores a valid one", async () => {
    expect(
      await setUnionBrandTheme("union-b7p", {
        primaryColor: "#fff",
        secondaryColor: "#ffffff",
        accentColor: "#000000",
      }),
    ).toEqual({ ok: false, status: 400, error: "Invalid brand theme" });

    expect(
      await setUnionBrandTheme("union-b7p", {
        primaryColor: "#112233",
        secondaryColor: "#445566",
        accentColor: "#778899",
      }),
    ).toEqual({ ok: true });
    expect(getTenantByUnionId("union-b7p")?.brandDefaults.primaryColor).toBe(
      "#112233",
    );
  });

  it("rejects an empty slug after sanitizing punctuation", async () => {
    expect(await updateUnionSlug("union-b7p", "!!!")).toEqual({
      ok: false,
      status: 400,
      error: "Slug is required",
    });
    expect(await updateUnionSlug("union-b7p", " New Slug!! ")).toEqual({
      ok: true,
      slug: "new-slug",
    });
  });
});
