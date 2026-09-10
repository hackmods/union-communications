import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  DELETE as deleteExpense,
  GET as getExpense,
  PATCH as patchExpense,
} from "@/app/api/expenses/[id]/route";
import {
  memoryExpenseStore,
  resetExpenseMemoryForTests,
} from "./memory-adapter";
import { resetExpenseStore } from "./store";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-steward-243",
      name: "Local 243 Steward",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-opseu"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-243"),
      roles: input?.roles ?? (["local_steward"] as UserRole[]),
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function seedDraft(input?: {
  unionId?: string;
  localId?: string;
  submittedById?: string;
  status?: "draft" | "submitted";
}) {
  const row = await memoryExpenseStore.create(
    {
      title: "Printer paper",
      purpose: "Steward desk supplies",
      lineItems: [
        {
          date: "2026-08-01",
          category: "supplies",
          amount: 45.5,
          description: "Staples run",
        },
      ],
    },
    {
      unionId: input?.unionId ?? "union-opseu",
      localId: input?.localId ?? "local-243",
      submittedById: input?.submittedById ?? "user-steward-243",
      submittedByName: "Local 243 Steward",
    },
  );
  if (input?.status === "submitted") {
    const submitted = await memoryExpenseStore.submit(row.id);
    if (!submitted) throw new Error("failed to submit test expense");
    return submitted;
  }
  return row;
}

describe("expense GET/PATCH/DELETE /api/expenses/[id]", () => {
  beforeEach(() => {
    resetExpenseMemoryForTests();
    resetExpenseStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetExpenseMemoryForTests();
    resetExpenseStore();
  });

  it("returns 401 without a session and 403 for members", async () => {
    const row = await seedDraft();
    authMock.mockResolvedValue(null);
    expect(
      (await getExpense(new Request("http://localhost"), params(row.id))).status,
    ).toBe(401);

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    const forbidden = await getExpense(
      new Request("http://localhost"),
      params(row.id),
    );
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "Forbidden" });
  });

  it("returns 404 for a missing id and for another union, including platform_admin", async () => {
    const foreign = await seedDraft({
      unionId: "union-other",
      localId: "local-1",
      submittedById: "user-other",
    });
    authMock.mockResolvedValue(
      session({
        id: "user-platform",
        roles: ["platform_admin"],
      }),
    );

    expect(
      (
        await getExpense(
          new Request("http://localhost"),
          params("es-does-not-exist"),
        )
      ).status,
    ).toBe(404);

    const crossUnion = await patchExpense(
      jsonRequest({ title: "Hijack" }),
      params(foreign.id),
    );
    expect(crossUnion.status).toBe(404);
    expect(await crossUnion.json()).toEqual({ error: "Not found" });
    expect((await memoryExpenseStore.getById(foreign.id))?.title).toBe(
      "Printer paper",
    );
  });

  it("lets a steward patch their own draft, rejects extra keys, and 403s a submitted edit", async () => {
    const draft = await seedDraft();
    authMock.mockResolvedValue(session());

    const forged = await patchExpense(
      jsonRequest({ title: "Renamed", unionId: "union-other" }),
      params(draft.id),
    );
    expect(forged.status).toBe(400);

    const patched = await patchExpense(
      jsonRequest({ title: "Renamed supplies" }),
      params(draft.id),
    );
    expect(patched.status).toBe(200);
    const body = (await patched.json()) as {
      submission: { title: string; unionId: string; status: string };
    };
    expect(body.submission.title).toBe("Renamed supplies");
    expect(body.submission.unionId).toBe("union-opseu");
    expect(body.submission.status).toBe("draft");

    const submitted = await seedDraft({ status: "submitted" });
    const locked = await patchExpense(
      jsonRequest({ title: "Too late" }),
      params(submitted.id),
    );
    expect(locked.status).toBe(403);
  });

  it("lets a steward delete their own draft and 403s deleting someone else's", async () => {
    const own = await seedDraft();
    const other = await seedDraft({ submittedById: "user-other-steward" });
    authMock.mockResolvedValue(session());

    const deleted = await deleteExpense(
      new Request("http://localhost"),
      params(own.id),
    );
    expect(deleted.status).toBe(200);
    expect(await memoryExpenseStore.getById(own.id)).toBeNull();

    const forbidden = await deleteExpense(
      new Request("http://localhost"),
      params(other.id),
    );
    expect(forbidden.status).toBe(403);
    expect(await memoryExpenseStore.getById(other.id)).not.toBeNull();
  });

  it("lets a president delete a submitted claim but not after approval", async () => {
    const submitted = await seedDraft({
      submittedById: "user-steward-243",
      status: "submitted",
    });
    authMock.mockResolvedValue(
      session({ id: "user-president-243", roles: ["local_president"] }),
    );
    const removed = await deleteExpense(
      new Request("http://localhost"),
      params(submitted.id),
    );
    expect(removed.status).toBe(200);

    const approved = await seedDraft({ status: "submitted" });
    await memoryExpenseStore.approve(approved.id, {
      approvedById: "user-president-243",
      ledgerEntryId: "led-test",
    });
    const locked = await deleteExpense(
      new Request("http://localhost"),
      params(approved.id),
    );
    expect(locked.status).toBe(403);
    expect((await memoryExpenseStore.getById(approved.id))?.status).toBe(
      "approved",
    );
  });
});
