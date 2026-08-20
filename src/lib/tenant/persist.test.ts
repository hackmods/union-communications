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
          id: "union-opseu",
          name: "OPSEU",
          slug: "opseu",
          defaultLocale: "en",
          enabledModules: ["comms", "portal"],
        },
      ],
      divisions: [],
      locals: [
        {
          id: "local-415",
          unionId: "union-opseu",
          localNumber: "415",
          subText: "Pilot local",
        },
      ],
      bargainingUnits: [
        {
          id: "bu-415-ft",
          unionId: "union-opseu",
          localId: "local-415",
          code: "ft",
          name: "Full-time",
        },
      ],
    });
    expect(findLocalByNumber("union-opseu", "243")?.id).toBe("local-243");
    expect(findLocalByNumber("union-opseu", "415")?.subText).toBe("Pilot local");
    const ctx = getTenantByUnionId("union-opseu");
    expect(ctx?.bargainingUnits?.some((u) => u.id === "bu-415-ft")).toBe(true);
    expect(ctx?.brandDefaults.assetPackPath).toContain("caat-opseu");
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
      unionId: "union-opseu",
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
      getTenantByUnionId("union-opseu")?.locals?.filter(
        (row) => row.id === "local-888",
      ) ?? [];
    expect(matches).toHaveLength(1);
  });
});

describe("overlay union defaults", () => {
  beforeEach(() => {
    resetTenantOverlayForTests();
  });

  it("enables portal on a newly provisioned union", () => {
    const seed = createOverlayUnion({ name: "Example Workers Union" });
    expect(seed.union.enabledModules).toContain("portal");
  });
});
