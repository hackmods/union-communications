import { describe, expect, it, beforeEach } from "vitest";
import {
  applyPersistedSnapshotToOverlay,
  tenantsPostgresEnabled,
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
