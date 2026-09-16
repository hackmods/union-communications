import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { withRlsContext } from "@/lib/db/rls-context";
import { withTenantRlsScope } from "@/lib/db/rls-store";

// These tests run WITHOUT DATABASE_URL so withRlsContext is a pass-through
// (memory mode) — no live Postgres required.
const savedUrl = process.env.DATABASE_URL;
beforeAll(() => {
  delete process.env.DATABASE_URL;
});
afterAll(() => {
  if (savedUrl !== undefined) process.env.DATABASE_URL = savedUrl;
});

describe("withRlsContext (memory mode)", () => {
  it("runs the operation once without a database", async () => {
    const fn = vi.fn(async () => 42);
    await expect(withRlsContext({ unionId: "u" }, fn)).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("withTenantRlsScope", () => {
  it("wraps list() with the tenant context derived from filters", async () => {
    const list = vi.fn(async () => ["a"]);
    const wrapped = withTenantRlsScope({ list } as never);
    const result = await (wrapped as unknown as {
      list(f: { unionId: string; localId?: string }): Promise<unknown[]>;
    }).list({ unionId: "union-opseu", localId: "local-243" });
    expect(result).toEqual(["a"]);
    expect(list).toHaveBeenCalledTimes(1);
    // Args passed through untouched.
    expect(list).toHaveBeenCalledWith({ unionId: "union-opseu", localId: "local-243" });
  });

  it("wraps create() with the tenant context from meta", async () => {
    const create = vi.fn(async () => ({ id: "task-1" }));
    const wrapped = withTenantRlsScope({ create } as never);
    const result = await (wrapped as unknown as {
      create(i: object, m: { unionId: string }): Promise<object>;
    }).create({ title: "x" }, { unionId: "union-opseu" });
    expect(result).toEqual({ id: "task-1" });
    expect(create).toHaveBeenCalledWith({ title: "x" }, { unionId: "union-opseu" });
  });

  it("passes methods without a derivable scope through unchanged", async () => {
    const getById = vi.fn(async () => null);
    const wrapped = withTenantRlsScope({ getById } as never);
    await (wrapped as unknown as { getById(id: string): Promise<unknown> }).getById("task-1");
    expect(getById).toHaveBeenCalledTimes(1);
    expect(getById).toHaveBeenCalledWith("task-1");
  });

  it("does not wrap list() when filters carry no unionId", async () => {
    const list = vi.fn(async () => []);
    const wrapped = withTenantRlsScope({ list } as never);
    await (wrapped as unknown as { list(f: object): Promise<unknown[]> }).list({ runId: "x" });
    expect(list).toHaveBeenCalledTimes(1);
  });
});