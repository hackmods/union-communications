import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isUnionEmpty,
  type UnionAttachmentCounts,
} from "./union-lifecycle";
import {
  createOverlayUnion,
  removeOverlayUnion,
  renameOverlayUnion,
  resetTenantOverlayForTests,
  setOverlayUnionArchived,
} from "@/lib/tenant/overlay";
import {
  getActiveTenantSeeds,
  getAllTenantSeeds,
  getTenantByUnionId,
} from "@/lib/tenant/loader";

describe("isUnionEmpty", () => {
  const empty: UnionAttachmentCounts = {
    locals: 0,
    activeLocals: 0,
    users: 0,
    divisions: 0,
    bargainingUnits: 0,
    memberships: 0,
    invites: 0,
    casework: 0,
  };

  it("is true only when locals, users, memberships, invites, units, and casework are zero", () => {
    expect(isUnionEmpty(empty)).toBe(true);
    expect(isUnionEmpty({ ...empty, divisions: 3 })).toBe(true);
    expect(isUnionEmpty({ ...empty, locals: 1 })).toBe(false);
    expect(isUnionEmpty({ ...empty, users: 1 })).toBe(false);
    expect(isUnionEmpty({ ...empty, casework: 2 })).toBe(false);
    expect(isUnionEmpty({ ...empty, invites: 1 })).toBe(false);
  });
});

describe("overlay union archive helpers", () => {
  beforeEach(() => {
    resetTenantOverlayForTests();
  });

  afterEach(() => {
    resetTenantOverlayForTests();
  });

  it("hides archived unions from active seed pickers", () => {
    const seed = createOverlayUnion({ name: "Example Workers" });
    expect(getActiveTenantSeeds().some((s) => s.union.id === seed.union.id)).toBe(
      true,
    );

    setOverlayUnionArchived(seed.union.id, new Date().toISOString());
    expect(getActiveTenantSeeds().some((s) => s.union.id === seed.union.id)).toBe(
      false,
    );
    expect(getAllTenantSeeds().some((s) => s.union.id === seed.union.id)).toBe(
      true,
    );
    expect(getTenantByUnionId(seed.union.id)?.union.archivedAt).toBeTruthy();
  });

  it("renames and removes overlay unions", () => {
    const seed = createOverlayUnion({ name: "Before" });
    renameOverlayUnion(seed.union.id, "After Name");
    expect(getTenantByUnionId(seed.union.id)?.union.name).toBe("After Name");
    removeOverlayUnion(seed.union.id);
    expect(getTenantByUnionId(seed.union.id)).toBeUndefined();
  });
});

describe("createUnionDurable name dedup", () => {
  beforeEach(() => {
    resetTenantOverlayForTests();
    vi.stubEnv("DATABASE_URL", "");
  });

  afterEach(() => {
    resetTenantOverlayForTests();
    vi.unstubAllEnvs();
  });

  it("reuses an active overlay union with the same display name", async () => {
    const { createUnionDurable } = await import("@/lib/tenant/persist");
    const first = await createUnionDurable({ name: "Shared Name Union" });
    const second = await createUnionDurable({ name: "shared name union" });
    expect(second.union.id).toBe(first.union.id);
  });
});
