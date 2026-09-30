import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isPostgresConfigured: vi.fn(() => true),
  isOwnerDbConfigured: vi.fn(() => true),
  getDb: vi.fn(),
  getOwnerDb: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  isPostgresConfigured: mocks.isPostgresConfigured,
  getDb: mocks.getDb,
}));
vi.mock("@/lib/db/owner-client", () => ({
  isOwnerDbConfigured: mocks.isOwnerDbConfigured,
  getOwnerDb: mocks.getOwnerDb,
}));
vi.mock("@/lib/tenant/overlay", () => ({
  removeOverlayLocal: vi.fn(),
  importOverlayLocal: vi.fn(),
  removeOverlayCollection: vi.fn(),
  importOverlayCollection: vi.fn(),
}));

import {
  executeLocalMove,
  isMissingRelationError,
  previewLocalMove,
} from "@/lib/site-admin/local-move";

describe("local-move gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPostgresConfigured.mockReturnValue(true);
    mocks.isOwnerDbConfigured.mockReturnValue(true);
  });

  it("treats missing-relation messages as skippable", () => {
    expect(isMissingRelationError(new Error('relation "portal_actions" does not exist'))).toBe(
      true,
    );
    expect(isMissingRelationError(new Error("unique_violation"))).toBe(false);
  });

  it("preview requires postgres", async () => {
    mocks.isPostgresConfigured.mockReturnValue(false);
    const result = await previewLocalMove({
      localId: "local-1",
      toUnionId: "union-b",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("postgres_required");
  });

  it("preview requires owner DB", async () => {
    mocks.isOwnerDbConfigured.mockReturnValue(false);
    const result = await previewLocalMove({
      localId: "local-1",
      toUnionId: "union-b",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("owner_db_required");
  });

  it("execute requires owner DB", async () => {
    mocks.isOwnerDbConfigured.mockReturnValue(false);
    const result = await executeLocalMove({
      localId: "local-1",
      toUnionId: "union-b",
      actorUserId: "op-1",
      confirmLocalNumber: "7",
      acknowledgeWarnings: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("owner_db_required");
  });

  it("preview returns local_not_found when the row is missing", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const db = {
      select: vi.fn(() => ({ from })),
      execute: vi.fn().mockResolvedValue([{ n: 0 }]),
    };
    mocks.getOwnerDb.mockReturnValue(db);
    mocks.getDb.mockReturnValue(db);

    const result = await previewLocalMove({
      localId: "missing",
      toUnionId: "union-b",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("local_not_found");
  });
});
