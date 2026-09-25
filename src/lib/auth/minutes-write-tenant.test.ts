import { afterEach, describe, expect, it, vi } from "vitest";
import type { MinutesWriteSession } from "@/lib/auth/minutes-write-tenant";

const unionExists = vi.fn();
const minutesDbBackend = vi.fn();

vi.mock("@/lib/tenant/union-exists", () => ({
  unionExists: (...args: unknown[]) => unionExists(...args),
}));

vi.mock("@/lib/db/backend", () => ({
  minutesDbBackend: (...args: unknown[]) => minutesDbBackend(...args),
}));

function session(
  overrides: Partial<MinutesWriteSession["user"]> = {},
): MinutesWriteSession {
  return {
    user: {
      id: "user-1",
      ...overrides,
    },
  };
}

describe("resolveMinutesWriteTenant", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("keeps solo fallback when minutes backend is memory", async () => {
    minutesDbBackend.mockReturnValue("memory");
    const { resolveMinutesWriteTenant } = await import(
      "@/lib/auth/minutes-write-tenant"
    );
    const result = await resolveMinutesWriteTenant(
      session({ unionId: undefined, localId: undefined }),
    );
    expect(result).toEqual({
      ok: true,
      unionId: "solo-union-user-1",
      localId: "solo-local-user-1",
    });
    expect(unionExists).not.toHaveBeenCalled();
  });

  it("rejects missing union when minutes backend is postgres", async () => {
    minutesDbBackend.mockReturnValue("postgres");
    const { resolveMinutesWriteTenant } = await import(
      "@/lib/auth/minutes-write-tenant"
    );
    const result = await resolveMinutesWriteTenant(
      session({ unionId: undefined }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/No union context/i);
    }
  });

  it("rejects solo-union synthetic ids on postgres", async () => {
    minutesDbBackend.mockReturnValue("postgres");
    const { resolveMinutesWriteTenant } = await import(
      "@/lib/auth/minutes-write-tenant"
    );
    const result = await resolveMinutesWriteTenant(
      session({ unionId: "solo-union-user-1" }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects union ids missing from unions table", async () => {
    minutesDbBackend.mockReturnValue("postgres");
    unionExists.mockResolvedValue(false);
    const { resolveMinutesWriteTenant } = await import(
      "@/lib/auth/minutes-write-tenant"
    );
    const result = await resolveMinutesWriteTenant(
      session({ unionId: "union-gone", localId: "local-1" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/lasting storage/i);
    }
  });

  it("accepts a real union on postgres", async () => {
    minutesDbBackend.mockReturnValue("postgres");
    unionExists.mockResolvedValue(true);
    const { resolveMinutesWriteTenant } = await import(
      "@/lib/auth/minutes-write-tenant"
    );
    const result = await resolveMinutesWriteTenant(
      session({ unionId: "union-b7p", localId: "local-7" }),
    );
    expect(result).toEqual({
      ok: true,
      unionId: "union-b7p",
      localId: "local-7",
    });
  });
});
