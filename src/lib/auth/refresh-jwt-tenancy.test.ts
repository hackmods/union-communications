import { afterEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";

const selectLimit = vi.fn();
const selectWhere = vi.fn(() => ({ limit: selectLimit }));
const selectFrom = vi.fn(() => ({ where: selectWhere }));
const select = vi.fn(() => ({ from: selectFrom }));

vi.mock("@/lib/db/client", () => ({
  getDb: () => ({ select }),
  isPostgresConfigured: () => true,
}));

describe("refreshJwtTenancyIfStale", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.AUTH_USERS_BACKEND;
  });

  it("no-ops when AUTH_USERS_BACKEND is not postgres", async () => {
    process.env.AUTH_USERS_BACKEND = "memory";
    const { refreshJwtTenancyIfStale } = await import(
      "@/lib/auth/refresh-jwt-tenancy"
    );
    const token = {
      sub: "u1",
      unionId: "union-a",
      sessionVersion: 0,
    } as JWT;
    const next = await refreshJwtTenancyIfStale(token);
    expect(next.unionId).toBe("union-a");
    expect(select).not.toHaveBeenCalled();
  });

  it("reloads tenancy when sessionVersion is ahead", async () => {
    process.env.AUTH_USERS_BACKEND = "postgres";
    selectLimit.mockResolvedValue([
      {
        unionId: "union-new",
        divisionId: null,
        localId: "local-9",
        bargainingUnitId: null,
        accessibleLocalIds: ["local-9"],
        roles: ["local_steward"],
        sessionVersion: 3,
        archivedAt: null,
        lockedAt: null,
      },
    ]);
    const { refreshJwtTenancyIfStale } = await import(
      "@/lib/auth/refresh-jwt-tenancy"
    );
    const token = {
      sub: "u1",
      unionId: "union-old",
      localId: "local-1",
      sessionVersion: 1,
      roles: ["solo_account"],
    } as JWT;
    const next = await refreshJwtTenancyIfStale(token);
    expect(next.unionId).toBe("union-new");
    expect(next.localId).toBe("local-9");
    expect(next.sessionVersion).toBe(3);
    expect(next.roles).toEqual(["local_steward"]);
  });

  it("leaves token alone when versions match", async () => {
    process.env.AUTH_USERS_BACKEND = "postgres";
    selectLimit.mockResolvedValue([
      {
        unionId: "union-a",
        divisionId: null,
        localId: "local-1",
        bargainingUnitId: null,
        accessibleLocalIds: ["local-1"],
        roles: ["local_steward"],
        sessionVersion: 2,
        archivedAt: null,
        lockedAt: null,
      },
    ]);
    const { refreshJwtTenancyIfStale } = await import(
      "@/lib/auth/refresh-jwt-tenancy"
    );
    const token = {
      sub: "u1",
      unionId: "union-a",
      localId: "local-1",
      sessionVersion: 2,
      roles: ["local_steward"],
    } as JWT;
    const next = await refreshJwtTenancyIfStale(token);
    expect(next.unionId).toBe("union-a");
    expect(next.sessionVersion).toBe(2);
  });

  it("clears stale JWT unionId when DB row was nulled without version bump", async () => {
    process.env.AUTH_USERS_BACKEND = "postgres";
    selectLimit.mockResolvedValue([
      {
        unionId: null,
        divisionId: null,
        localId: null,
        bargainingUnitId: null,
        accessibleLocalIds: null,
        roles: ["platform_admin"],
        sessionVersion: 1,
        archivedAt: null,
        lockedAt: null,
      },
    ]);
    const { refreshJwtTenancyIfStale } = await import(
      "@/lib/auth/refresh-jwt-tenancy"
    );
    const token = {
      sub: "u1",
      unionId: "union-purged",
      localId: "local-gone",
      sessionVersion: 1,
      roles: ["platform_admin"],
    } as JWT;
    const next = await refreshJwtTenancyIfStale(token);
    expect(next.unionId).toBeUndefined();
    expect(next.localId).toBeUndefined();
    expect(next.sessionVersion).toBe(1);
  });
});
