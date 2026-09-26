import { beforeEach, describe, expect, it, vi } from "vitest";

const { isPostgresConfiguredMock, getDbMock } = vi.hoisted(() => ({
  isPostgresConfiguredMock: vi.fn(),
  getDbMock: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  isPostgresConfigured: isPostgresConfiguredMock,
  getDb: getDbMock,
}));

import { countUnions, unionExists } from "@/lib/tenant/union-exists";

describe("unionExists", () => {
  beforeEach(() => {
    isPostgresConfiguredMock.mockReset();
    getDbMock.mockReset();
  });

  it("rejects blank ids and fail-opens when Postgres is unset", async () => {
    isPostgresConfiguredMock.mockReturnValue(false);
    expect(await unionExists("")).toBe(false);
    expect(await unionExists("   ")).toBe(false);
    expect(await unionExists("union-b7p")).toBe(true);
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("returns whether the unions row exists", async () => {
    isPostgresConfiguredMock.mockReturnValue(true);
    const limit = vi.fn().mockResolvedValue([{ id: "union-b7p" }]);
    getDbMock.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({ limit }),
        }),
      }),
    });
    expect(await unionExists("union-b7p")).toBe(true);

    limit.mockResolvedValueOnce([]);
    expect(await unionExists("union-missing")).toBe(false);
  });

  it("fail-opens when the lookup throws", async () => {
    isPostgresConfiguredMock.mockReturnValue(true);
    getDbMock.mockImplementation(() => {
      throw new Error("db down");
    });
    expect(await unionExists("union-b7p")).toBe(true);
  });
});

describe("countUnions", () => {
  beforeEach(() => {
    isPostgresConfiguredMock.mockReset();
    getDbMock.mockReset();
  });

  it("returns null when Postgres is unset or the query fails", async () => {
    isPostgresConfiguredMock.mockReturnValue(false);
    expect(await countUnions()).toBeNull();

    isPostgresConfiguredMock.mockReturnValue(true);
    getDbMock.mockImplementation(() => {
      throw new Error("db down");
    });
    expect(await countUnions()).toBeNull();
  });

  it("returns the integer row count", async () => {
    isPostgresConfiguredMock.mockReturnValue(true);
    getDbMock.mockReturnValue({
      select: () => ({
        from: () => Promise.resolve([{ count: 2 }]),
      }),
    });
    expect(await countUnions()).toBe(2);
  });
});
