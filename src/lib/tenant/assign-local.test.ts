import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  getDbMock,
  selectLimitMock,
  createUnionDurableMock,
  findOrCreateLocalMock,
  applyRlsContextMock,
  isOwnerDbConfiguredMock,
} = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  selectLimitMock: vi.fn(),
  createUnionDurableMock: vi.fn(),
  findOrCreateLocalMock: vi.fn(),
  applyRlsContextMock: vi.fn().mockResolvedValue(undefined),
  isOwnerDbConfiguredMock: vi.fn(() => false),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: getDbMock,
  getRlsTx: () => null,
}));

vi.mock("@/lib/db/owner-client", () => ({
  isOwnerDbConfigured: () => isOwnerDbConfiguredMock(),
  getOwnerDb: getDbMock,
}));

vi.mock("@/lib/db/rls-context", () => ({
  applyRlsContext: applyRlsContextMock,
}));

vi.mock("@/lib/tenant/persist", () => ({
  createUnionDurable: createUnionDurableMock,
  findOrCreateLocal: findOrCreateLocalMock,
}));

import {
  assignUserLocal,
  classifyAssignLocalFailure,
  updateUnionMembershipPolicy,
} from "./assign-local";

function chainSelect(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { select: vi.fn().mockReturnValue({ from }), limit, where };
}

describe("classifyAssignLocalFailure", () => {
  it("maps authority, scope, sync, and RLS write failures", () => {
    expect(
      classifyAssignLocalFailure(new Error("membership management authority required")),
    ).toMatchObject({ ok: false, code: "membership_authority_denied", status: 403 });
    expect(
      classifyAssignLocalFailure(new Error("membership authority denied")),
    ).toMatchObject({ ok: false, code: "membership_authority_denied", status: 403 });
    expect(
      classifyAssignLocalFailure(new Error("membership scope denied")),
    ).toMatchObject({ ok: false, code: "membership_scope_denied", status: 403 });
    expect(
      classifyAssignLocalFailure(new Error("active local membership required")),
    ).toMatchObject({ ok: false, code: "membership_sync_required", status: 409 });
    expect(
      classifyAssignLocalFailure(new Error("new row violates row-level security policy")),
    ).toMatchObject({ ok: false, code: "membership_write_blocked", status: 403 });
    expect(classifyAssignLocalFailure(new Error("connection reset"))).toBeNull();
  });
});

describe("assignUserLocal", () => {
  beforeEach(() => {
    getDbMock.mockReset();
    createUnionDurableMock.mockReset();
    findOrCreateLocalMock.mockReset();
    selectLimitMock.mockReset();
    applyRlsContextMock.mockClear();
    isOwnerDbConfiguredMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns single_local_conflict when another active membership exists", async () => {
    const userChain = chainSelect([
      {
        id: "user-1",
        unionId: "union-1",
        localId: "local-a",
        accessibleLocalIds: ["local-a"],
        archivedAt: null,
        lockedAt: null,
      },
    ]);
    const unionChain = chainSelect([
      {
        id: "union-1",
        membershipPolicy: "single_local",
        archivedAt: null,
      },
    ]);
    const localChain = chainSelect([
      {
        id: "local-b",
        unionId: "union-1",
        archivedAt: null,
      },
    ]);
    const membershipSelect = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: "mem-a", localId: "local-a" },
          ]),
        }),
      }),
    };

    let selectCall = 0;
    getDbMock.mockReturnValue({
      select: (...args: unknown[]) => {
        selectCall += 1;
        if (selectCall === 1) return userChain.select(...args);
        if (selectCall === 2) return unionChain.select(...args);
        if (selectCall === 3) return localChain.select(...args);
        return membershipSelect.select(...args);
      },
      transaction: vi.fn(),
      execute: vi.fn(),
    });

    const result = await assignUserLocal({
      actorUserId: "admin-1",
      targetUserId: "user-1",
      unionId: "union-1",
      localId: "local-b",
      setPrimary: true,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 409,
      code: "single_local_conflict",
      conflictingLocalIds: ["local-a"],
    });
  });

  it("rejects missing unionId and newUnionName", async () => {
    const userChain = chainSelect([
      {
        id: "user-1",
        unionId: null,
        localId: null,
        accessibleLocalIds: [],
        archivedAt: null,
        lockedAt: null,
      },
    ]);
    getDbMock.mockReturnValue({
      select: userChain.select,
      transaction: vi.fn(),
      execute: vi.fn(),
    });

    const result = await assignUserLocal({
      actorUserId: "admin-1",
      targetUserId: "user-1",
      localNumber: "42",
    });

    expect(result).toMatchObject({
      ok: false,
      status: 400,
      error: "unionId or newUnionName is required",
    });
  });

  it("binds platformAdmin RLS GUCs even when owner DB is configured", async () => {
    isOwnerDbConfiguredMock.mockReturnValue(true);
    const userChain = chainSelect([
      {
        id: "user-1",
        unionId: "union-other",
        localId: "local-a",
        accessibleLocalIds: ["local-a"],
        archivedAt: null,
        lockedAt: null,
      },
    ]);
    const unionChain = chainSelect([
      {
        id: "union-1",
        membershipPolicy: "multi_local",
        archivedAt: null,
      },
    ]);
    const localChain = chainSelect([
      {
        id: "local-b",
        unionId: "union-1",
        archivedAt: null,
      },
    ]);
    const membershipSelect = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };

    const insertValues = vi.fn().mockResolvedValue(undefined);
    const userReturning = vi.fn().mockResolvedValue([{ id: "user-1" }]);
    const userWhere = vi.fn().mockReturnValue({ returning: userReturning });
    const userSet = vi.fn().mockReturnValue({ where: userWhere });
    const updateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    const execute = vi.fn().mockResolvedValue(undefined);

    let selectCall = 0;
    getDbMock.mockReturnValue({
      select: (...args: unknown[]) => {
        selectCall += 1;
        if (selectCall === 1) return userChain.select(...args);
        if (selectCall === 2) return unionChain.select(...args);
        if (selectCall === 3) return localChain.select(...args);
        return membershipSelect.select(...args);
      },
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({ values: insertValues }),
          update: vi.fn().mockReturnValue({ set: userSet }),
          execute,
        };
        // First update is isPrimary clear; second is users patch.
        let updateCall = 0;
        tx.update = vi.fn().mockImplementation(() => {
          updateCall += 1;
          if (updateCall === 1) {
            return { set: updateSet };
          }
          return { set: userSet };
        });
        return fn(tx);
      }),
      execute,
    });

    const result = await assignUserLocal({
      actorUserId: "admin-b7p",
      targetUserId: "user-1",
      unionId: "union-1",
      localId: "local-b",
      setPrimary: true,
    });

    expect(result).toMatchObject({
      ok: true,
      unionId: "union-1",
      localId: "local-b",
    });
    expect(applyRlsContextMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        unionId: "union-1",
        localId: "local-b",
        userId: "admin-b7p",
        crossLocal: true,
        mfaVerified: true,
        platformAdmin: true,
      }),
    );
    expect(execute).toHaveBeenCalled();
  });

  it("returns membership_write_blocked when an existing membership update returns no row", async () => {
    const userChain = chainSelect([
      {
        id: "user-1",
        unionId: "union-1",
        localId: "local-b",
        accessibleLocalIds: ["local-b"],
        archivedAt: null,
        lockedAt: null,
      },
    ]);
    const unionChain = chainSelect([
      {
        id: "union-1",
        membershipPolicy: "multi_local",
        archivedAt: null,
      },
    ]);
    const localChain = chainSelect([
      {
        id: "local-b",
        unionId: "union-1",
        archivedAt: null,
      },
    ]);
    const membershipSelect = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };

    let selectCall = 0;
    getDbMock.mockReturnValue({
      select: (...args: unknown[]) => {
        selectCall += 1;
        if (selectCall === 1) return userChain.select(...args);
        if (selectCall === 2) return unionChain.select(...args);
        if (selectCall === 3) return localChain.select(...args);
        return membershipSelect.select(...args);
      },
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    id: "mem-1",
                    bargainingUnitId: null,
                  },
                ]),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
          execute: vi.fn(),
        };
        return fn(tx);
      }),
    });

    const result = await assignUserLocal({
      actorUserId: "admin-1",
      targetUserId: "user-1",
      unionId: "union-1",
      localId: "local-b",
      setPrimary: true,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 403,
      code: "membership_write_blocked",
    });
  });
});

describe("updateUnionMembershipPolicy", () => {
  beforeEach(() => {
    getDbMock.mockReset();
  });

  it("rejects invalid policy strings", async () => {
    const result = await updateUnionMembershipPolicy(
      "union-1",
      "invalid" as "multi_local",
    );
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Invalid membership policy",
    });
  });

  it("returns 404 when the union is missing", async () => {
    const chain = chainSelect([]);
    getDbMock.mockReturnValue({
      select: chain.select,
      update: vi.fn(),
    });
    const result = await updateUnionMembershipPolicy("missing", "single_local");
    expect(result).toEqual({
      ok: false,
      status: 404,
      error: "Union not found",
    });
  });

  it("updates policy when the union exists", async () => {
    const chain = chainSelect([{ id: "union-1" }]);
    const set = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    getDbMock.mockReturnValue({
      select: chain.select,
      update: vi.fn().mockReturnValue({ set }),
    });
    const result = await updateUnionMembershipPolicy(
      "union-1",
      "single_local",
    );
    expect(result).toEqual({ ok: true });
    expect(set).toHaveBeenCalledWith({ membershipPolicy: "single_local" });
  });
});
