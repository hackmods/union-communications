import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  getDbMock,
  selectLimitMock,
  createUnionDurableMock,
  findOrCreateLocalMock,
} = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  selectLimitMock: vi.fn(),
  createUnionDurableMock: vi.fn(),
  findOrCreateLocalMock: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: getDbMock,
}));

vi.mock("@/lib/tenant/persist", () => ({
  createUnionDurable: createUnionDurableMock,
  findOrCreateLocal: findOrCreateLocalMock,
}));

import {
  assignUserLocal,
  updateUnionMembershipPolicy,
} from "./assign-local";

function chainSelect(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { select: vi.fn().mockReturnValue({ from }), limit, where };
}

describe("assignUserLocal", () => {
  beforeEach(() => {
    getDbMock.mockReset();
    createUnionDurableMock.mockReset();
    findOrCreateLocalMock.mockReset();
    selectLimitMock.mockReset();
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
