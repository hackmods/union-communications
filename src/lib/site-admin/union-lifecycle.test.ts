import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  duplicateNameKeys,
  isUnionEmpty,
  sortUnionsForSiteAdmin,
  unionNameKey,
  type UnionAttachmentCounts,
  type UnionLifecycleRow,
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

describe("union list helpers", () => {
  const base = (
    partial: Partial<UnionLifecycleRow> & Pick<UnionLifecycleRow, "id" | "name">,
  ): UnionLifecycleRow => ({
    slug: partial.slug ?? partial.id,
    isDemo: false,
    archivedAt: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    membershipPolicy: "multi_local",
    localCount: 0,
    activeLocalCount: 0,
    userCount: 0,
    inviteCount: 0,
    membershipCount: 0,
    caseworkCount: 0,
    empty: true,
    ...partial,
  });

  it("flags case-insensitive duplicate display names", () => {
    const rows = [
      base({ id: "a", name: "OPSEU SEFPO" }),
      base({ id: "b", name: "opseu sefpo" }),
      base({ id: "c", name: "Behind 7 Proxies" }),
    ];
    const keys = duplicateNameKeys(rows);
    expect(keys.has(unionNameKey("OPSEU SEFPO"))).toBe(true);
    expect(keys.has(unionNameKey("Behind 7 Proxies"))).toBe(false);
  });

  it("sorts active before archived, then by name and created", () => {
    const rows = [
      base({
        id: "z",
        name: "Zed",
        archivedAt: "2026-09-20T00:00:00.000Z",
      }),
      base({
        id: "a2",
        name: "Alpha",
        createdAt: "2026-09-10T00:00:00.000Z",
      }),
      base({
        id: "a1",
        name: "Alpha",
        createdAt: "2026-09-01T00:00:00.000Z",
      }),
    ];
    expect(sortUnionsForSiteAdmin(rows).map((r) => r.id)).toEqual([
      "a1",
      "a2",
      "z",
    ]);
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
