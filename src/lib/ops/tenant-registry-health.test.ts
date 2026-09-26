import { beforeEach, describe, expect, it, vi } from "vitest";

const { countUnionsMock } = vi.hoisted(() => ({
  countUnionsMock: vi.fn(),
}));

vi.mock("@/lib/tenant/union-exists", () => ({
  countUnions: countUnionsMock,
}));

import { readTenantRegistryHealth } from "@/lib/ops/health-status";

describe("readTenantRegistryHealth", () => {
  beforeEach(() => {
    countUnionsMock.mockReset();
  });

  it("stays unknown when Postgres is unset or the count fails", async () => {
    expect(await readTenantRegistryHealth(false)).toEqual({
      unionCount: null,
      seeded: null,
    });
    expect(countUnionsMock).not.toHaveBeenCalled();

    countUnionsMock.mockResolvedValue(null);
    expect(await readTenantRegistryHealth(true)).toEqual({
      unionCount: null,
      seeded: null,
    });
  });

  it("marks an empty registry unseeded and a populated one seeded", async () => {
    countUnionsMock.mockResolvedValueOnce(0);
    expect(await readTenantRegistryHealth(true)).toEqual({
      unionCount: 0,
      seeded: false,
    });

    countUnionsMock.mockResolvedValueOnce(3);
    expect(await readTenantRegistryHealth(true)).toEqual({
      unionCount: 3,
      seeded: true,
    });
  });
});
