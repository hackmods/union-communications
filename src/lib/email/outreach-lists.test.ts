import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({
  isPostgresConfigured: vi.fn(() => false),
}));
vi.mock("@/lib/email/enterprise-gates", () => ({
  assertEnterpriseEmailCapability: vi.fn(),
}));

import { isPostgresConfigured } from "@/lib/db/client";
import { assertEnterpriseEmailCapability } from "@/lib/email/enterprise-gates";
import {
  memoryGetLists,
  resetOutreachListsMemory,
} from "@/lib/email/outreach-lists-memory";
import { createOutreachList } from "./outreach-lists";

describe("createOutreachList", () => {
  beforeEach(() => {
    resetOutreachListsMemory();
    vi.mocked(isPostgresConfigured).mockReturnValue(false);
    vi.mocked(assertEnterpriseEmailCapability).mockResolvedValue({ ok: true });
  });

  it("creates a list in memory when Postgres is off", async () => {
    const result = await createOutreachList({
      unionId: "union-1",
      createdById: "user-1",
      name: "Allies",
      purpose: "Mobilization",
      rls: { userId: "user-1", unionId: "union-1", crossLocal: true, mfaVerified: true },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(memoryGetLists("union-1")).toHaveLength(1);
      expect(memoryGetLists("union-1")[0]?.name).toContain("Allies");
    }
  });

  it("returns gate_closed when enterprise gate fails", async () => {
    vi.mocked(assertEnterpriseEmailCapability).mockResolvedValue({
      ok: false,
      reason: "host_disabled",
    });
    const result = await createOutreachList({
      unionId: "union-1",
      createdById: "user-1",
      name: "Allies",
      rls: { userId: "user-1", unionId: "union-1", crossLocal: true, mfaVerified: true },
    });
    expect(result).toEqual({ ok: false, reason: "gate_closed" });
  });
});
