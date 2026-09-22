import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as listMyCases } from "@/app/api/portal/my-cases/route";
import { GET as downloadMyCaseAttachment } from "@/app/api/portal/my-cases/[id]/attachments/[attachmentId]/route";
import {
  memoryGrievanceStore,
  resetGrievanceMemoryForTests,
} from "@/lib/grievance/memory-adapter";
import { resetGrievanceStore } from "@/lib/grievance/store";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
  accessibleLocalIds?: string[];
}) {
  return {
    user: {
      id: input?.id ?? "user-member-7",
      name: "Local 7 Member",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-b7p"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-7"),
      roles: input?.roles ?? (["local_member"] as UserRole[]),
      accessibleLocalIds: input?.accessibleLocalIds,
    },
  };
}

describe("Portal my-cases HTTP", () => {
  beforeEach(() => {
    resetGrievanceMemoryForTests();
    resetGrievanceStore();
    authMock.mockReset();
    vi.stubEnv("DATABASE_URL", "");
  });

  afterEach(() => {
    resetGrievanceMemoryForTests();
    resetGrievanceStore();
    vi.unstubAllEnvs();
  });

  it("returns 401 without a session and 403 without a union", async () => {
    authMock.mockResolvedValue(null);
    expect((await listMyCases()).status).toBe(401);

    authMock.mockResolvedValue(session({ unionId: null }));
    const forbidden = await listMyCases();
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "No union context" });
  });

  it("returns only the member's own cases with the member-safe allowlist", async () => {
    const mine = await memoryGrievanceStore.create(
      {
        category: "Hours of work",
        filedAt: "2026-09-01T00:00:00.000Z",
        memberUserId: "user-member-7",
        memberPseudonym: "Keep this private",
      },
      {
        unionId: "union-b7p",
        localId: "local-7",
        createdById: "user-president-7",
        assignedStewardId: "user-steward-7",
      },
    );
    await memoryGrievanceStore.create(
      {
        category: "Discipline",
        filedAt: "2026-09-02T00:00:00.000Z",
        memberUserId: "user-other-member",
        memberPseudonym: "Someone else",
      },
      {
        unionId: "union-b7p",
        localId: "local-7",
        createdById: "user-president-7",
        assignedStewardId: "user-steward-7",
      },
    );
    await memoryGrievanceStore.create(
      {
        category: "Hours of work",
        filedAt: "2026-09-03T00:00:00.000Z",
        memberUserId: "user-member-7",
      },
      {
        unionId: "union-b7p",
        localId: "local-1337",
        createdById: "user-president-7",
        assignedStewardId: "user-steward-7",
      },
    );
    await memoryGrievanceStore.create(
      {
        category: "Hours of work",
        filedAt: "2026-09-04T00:00:00.000Z",
        memberUserId: "user-member-7",
      },
      {
        unionId: "union-other",
        localId: "local-1",
        createdById: "user-x",
        assignedStewardId: "user-x",
      },
    );

    authMock.mockResolvedValue(
      session({ accessibleLocalIds: ["local-1337", "local-1"] }),
    );
    const res = await listMyCases();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      cases: Array<Record<string, unknown>>;
    };
    expect(body.cases).toHaveLength(1);
    expect(body.cases[0]?.id).toBe(mine.grievance.id);
    expect(Object.keys(body.cases[0] ?? {}).sort()).toEqual([
      "attachments",
      "category",
      "currentStep",
      "dueAt",
      "filedAt",
      "id",
      "status",
      "updates",
    ]);
    expect(body.cases[0]).not.toHaveProperty("memberPseudonym");
    expect(body.cases[0]).not.toHaveProperty("assignedStewardId");
    expect(body.cases[0]).not.toHaveProperty("memberUserId");
    expect(body.cases[0]?.updates).toEqual([]);
    expect(body.cases[0]?.attachments).toEqual([]);
  });

  it("returns 401 without a session and 404s member attachment download without Postgres", async () => {
    authMock.mockResolvedValue(null);
    expect(
      (
        await downloadMyCaseAttachment(new Request("http://localhost"), {
          params: Promise.resolve({
            id: "grev-001",
            attachmentId: "att-001",
          }),
        })
      ).status,
    ).toBe(401);

    const mine = await memoryGrievanceStore.create(
      {
        category: "Hours of work",
        filedAt: "2026-09-01T00:00:00.000Z",
        memberUserId: "user-member-7",
      },
      {
        unionId: "union-b7p",
        localId: "local-7",
        createdById: "user-president-7",
        assignedStewardId: "user-steward-7",
      },
    );
    authMock.mockResolvedValue(session());
    const res = await downloadMyCaseAttachment(new Request("http://localhost"), {
      params: Promise.resolve({
        id: mine.grievance.id,
        attachmentId: "att-shared",
      }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});
