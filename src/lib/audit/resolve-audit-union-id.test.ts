import { afterEach, describe, expect, it, vi } from "vitest";

const unionExists = vi.fn();

vi.mock("@/lib/tenant/union-exists", () => ({
  unionExists: (...args: unknown[]) => unionExists(...args),
}));

describe("resolveAuditUnionId", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns undefined for empty / synthetic ids without DB lookup", async () => {
    const { resolveAuditUnionId } = await import(
      "@/lib/audit/resolve-audit-union-id"
    );
    expect(await resolveAuditUnionId(undefined)).toBeUndefined();
    expect(await resolveAuditUnionId("")).toBeUndefined();
    expect(await resolveAuditUnionId("__none__")).toBeUndefined();
    expect(await resolveAuditUnionId("solo-union-user-1")).toBeUndefined();
    expect(unionExists).not.toHaveBeenCalled();
  });

  it("returns the id when the union row exists", async () => {
    unionExists.mockResolvedValue(true);
    const { resolveAuditUnionId } = await import(
      "@/lib/audit/resolve-audit-union-id"
    );
    expect(await resolveAuditUnionId("union-b7p")).toBe("union-b7p");
    expect(unionExists).toHaveBeenCalledWith("union-b7p");
  });

  it("soft-nulls orphan union ids", async () => {
    unionExists.mockResolvedValue(false);
    const { resolveAuditUnionId } = await import(
      "@/lib/audit/resolve-audit-union-id"
    );
    expect(await resolveAuditUnionId("union-gone")).toBeUndefined();
  });
});
