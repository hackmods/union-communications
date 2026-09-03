import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listExpenses,
  POST as createExpense,
} from "@/app/api/expenses/route";
import { POST as submitExpense } from "@/app/api/expenses/[id]/submit/route";
import { POST as approveExpense } from "@/app/api/expenses/[id]/approve/route";
import { POST as denyExpense } from "@/app/api/expenses/[id]/deny/route";
import {
  memoryExpenseStore,
  resetExpenseMemoryForTests,
} from "./memory-adapter";
import { resetExpenseStore } from "./store";
import { memoryLedgerStore, resetLedgerMemoryForTests } from "@/lib/ledger/memory-adapter";
import { resetLedgerStore } from "@/lib/ledger/store";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-president-243",
      name: "Local 243 President",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-opseu"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-243"),
      roles: input?.roles ?? (["local_president"] as UserRole[]),
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

function listRequest(query = ""): Request {
  return new Request(`http://localhost/api/expenses${query}`);
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const validCreate = {
  title: "Printer paper",
  purpose: "Steward desk supplies",
  lineItems: [
    {
      date: "2026-08-01",
      category: "supplies" as const,
      amount: 45.5,
      description: "Staples run",
    },
  ],
};

async function seedSubmitted(input?: {
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
  if (input?.status === "draft") return row;
  const submitted = await memoryExpenseStore.submit(row.id);
  if (!submitted) throw new Error("failed to submit test expense");
  return submitted;
}

describe("expense approve/deny API", () => {
  beforeEach(() => {
    resetExpenseMemoryForTests();
    resetExpenseStore();
    resetLedgerMemoryForTests();
    resetLedgerStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetExpenseMemoryForTests();
    resetExpenseStore();
    resetLedgerMemoryForTests();
    resetLedgerStore();
  });

  it("returns 401 without a session and 403 for members", async () => {
    const row = await seedSubmitted();
    authMock.mockResolvedValue(null);
    expect(
      (await approveExpense(new Request("http://localhost"), params(row.id)))
        .status,
    ).toBe(401);

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    const forbidden = await approveExpense(
      new Request("http://localhost"),
      params(row.id),
    );
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "Forbidden" });
  });

  it("forbids a steward from approving or denying", async () => {
    const row = await seedSubmitted();
    authMock.mockResolvedValue(
      session({ id: "user-steward-243", roles: ["local_steward"] }),
    );
    expect(
      (await approveExpense(new Request("http://localhost"), params(row.id)))
        .status,
    ).toBe(403);
    expect(
      (await denyExpense(jsonRequest({ reason: "No receipt" }), params(row.id)))
        .status,
    ).toBe(403);
    expect((await memoryExpenseStore.getById(row.id))?.status).toBe("submitted");
  });

  it("returns 404 for a missing id and for another union, including platform_admin", async () => {
    const foreign = await seedSubmitted({
      unionId: "union-other",
      localId: "local-1",
      submittedById: "user-other",
    });

    authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
    const missing = await approveExpense(
      new Request("http://localhost"),
      params("es-does-not-exist"),
    );
    expect(missing.status).toBe(404);

    const crossUnion = await approveExpense(
      new Request("http://localhost"),
      params(foreign.id),
    );
    expect(crossUnion.status).toBe(404);
    expect(await crossUnion.json()).toEqual({ error: "Not found" });
    expect((await memoryExpenseStore.getById(foreign.id))?.status).toBe(
      "submitted",
    );
  });

  it("returns 409 unless the expense is submitted", async () => {
    const draft = await seedSubmitted({ status: "draft" });
    authMock.mockResolvedValue(session());
    const res = await approveExpense(
      new Request("http://localhost"),
      params(draft.id),
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "Only submitted expenses can be approved",
    });
  });

  it("approves once, posts a ledger expense, then 409s on retry", async () => {
    const row = await seedSubmitted();
    authMock.mockResolvedValue(session());
    const first = await approveExpense(
      new Request("http://localhost"),
      params(row.id),
    );
    expect(first.status).toBe(200);
    const body = (await first.json()) as {
      submission: {
        id: string;
        status: string;
        approvedById?: string;
        ledgerEntryId?: string;
      };
      ledgerEntryId: string;
    };
    expect(body.submission.id).toBe(row.id);
    expect(body.submission.status).toBe("approved");
    expect(body.submission.approvedById).toBe("user-president-243");
    expect(body.ledgerEntryId).toBeTruthy();

    const ledger = await memoryLedgerStore.getById(body.ledgerEntryId);
    expect(ledger).toMatchObject({
      unionId: "union-opseu",
      localId: "local-243",
      type: "expense",
      category: "union_business",
      amount: 45.5,
      recordedById: "user-president-243",
    });

    const retry = await approveExpense(
      new Request("http://localhost"),
      params(row.id),
    );
    expect(retry.status).toBe(409);
    expect(await retry.json()).toEqual({
      error: "Only submitted expenses can be approved",
    });
  });

  it("rejects extra deny keys, then denies with the given reason", async () => {
    const row = await seedSubmitted();
    authMock.mockResolvedValue(session());
    const forged = await denyExpense(
      jsonRequest({
        reason: "Missing receipt",
        unionId: "union-other",
        status: "approved",
      }),
      params(row.id),
    );
    expect(forged.status).toBe(400);

    const denied = await denyExpense(
      jsonRequest({ reason: "Missing receipt" }),
      params(row.id),
    );
    expect(denied.status).toBe(200);
    const body = (await denied.json()) as {
      submission: { status: string; deniedReason?: string };
    };
    expect(body.submission.status).toBe("denied");
    expect(body.submission.deniedReason).toBe("Missing receipt");
  });
});

describe("expense list/create/submit API", () => {
  beforeEach(() => {
    resetExpenseMemoryForTests();
    resetExpenseStore();
    resetLedgerMemoryForTests();
    resetLedgerStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetExpenseMemoryForTests();
    resetExpenseStore();
    resetLedgerMemoryForTests();
    resetLedgerStore();
  });

  it("returns 401 without a session and 403 for members", async () => {
    authMock.mockResolvedValue(null);
    expect((await listExpenses(listRequest())).status).toBe(401);

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    const forbidden = await listExpenses(listRequest());
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    expect((await createExpense(jsonRequest(validCreate))).status).toBe(403);
  });

  it("does not list another union or another local for a president", async () => {
    await memoryExpenseStore.create(validCreate, {
      unionId: "union-other",
      localId: "local-243",
      submittedById: "user-x",
      submittedByName: "X",
    });
    await memoryExpenseStore.create(validCreate, {
      unionId: "union-opseu",
      localId: "local-560",
      submittedById: "user-y",
      submittedByName: "Y",
    });
    const mine = await memoryExpenseStore.create(
      { ...validCreate, title: "Local 243 toner" },
      {
        unionId: "union-opseu",
        localId: "local-243",
        submittedById: "user-president-243",
        submittedByName: "Local 243 President",
      },
    );

    authMock.mockResolvedValue(session());
    const res = await listExpenses(listRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ id: string; title: string; unionId: string; localId: string }>;
    };
    expect(body.items.every((row) => row.unionId === "union-opseu")).toBe(true);
    expect(body.items.every((row) => row.localId === "local-243")).toBe(true);
    expect(body.items.map((row) => row.id)).toEqual([mine.id]);
    expect(body.items.map((row) => row.title)).not.toContain("Printer paper");
  });

  it("honours mine=1 and ignores an unknown status filter", async () => {
    await memoryExpenseStore.create(validCreate, {
      unionId: "union-opseu",
      localId: "local-243",
      submittedById: "user-steward-243",
      submittedByName: "Local 243 Steward",
    });
    const mine = await memoryExpenseStore.create(
      { ...validCreate, title: "President mileage" },
      {
        unionId: "union-opseu",
        localId: "local-243",
        submittedById: "user-president-243",
        submittedByName: "Local 243 President",
      },
    );

    authMock.mockResolvedValue(session());
    const mineOnly = await listExpenses(listRequest("?mine=1"));
    const mineBody = (await mineOnly.json()) as {
      items: Array<{ id: string; submittedById: string }>;
    };
    expect(mineBody.items).toHaveLength(1);
    expect(mineBody.items[0]?.id).toBe(mine.id);
    expect(mineBody.items[0]?.submittedById).toBe("user-president-243");

    const junkStatus = await listExpenses(listRequest("?status=hacked"));
    const junkBody = (await junkStatus.json()) as { items: Array<{ id: string }> };
    expect(junkBody.items).toHaveLength(2);
  });

  it("rejects forged tenant keys, then stamps the session union/local/submitter", async () => {
    authMock.mockResolvedValue(session());
    const forged = await createExpense(
      jsonRequest({
        ...validCreate,
        unionId: "union-other",
        localId: "local-evil",
        submittedById: "attacker",
      }),
    );
    expect(forged.status).toBe(400);

    const created = await createExpense(jsonRequest(validCreate));
    expect(created.status).toBe(201);
    const body = (await created.json()) as {
      submission: {
        unionId: string;
        localId: string;
        submittedById: string;
        status: string;
        totalAmount: number;
      };
    };
    expect(body.submission.unionId).toBe("union-opseu");
    expect(body.submission.localId).toBe("local-243");
    expect(body.submission.submittedById).toBe("user-president-243");
    expect(body.submission.status).toBe("draft");
    expect(body.submission.totalAmount).toBe(45.5);
  });

  it("returns 400 when the session has no local", async () => {
    authMock.mockResolvedValue(
      session({ roles: ["union_admin"], localId: null }),
    );
    const res = await createExpense(jsonRequest(validCreate));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Local required" });
  });

  it("returns 404 for another union on submit, including platform_admin, and lets the owner submit a draft", async () => {
    const foreign = await memoryExpenseStore.create(validCreate, {
      unionId: "union-other",
      localId: "local-1",
      submittedById: "user-other",
      submittedByName: "Other",
    });
    const draft = await memoryExpenseStore.create(validCreate, {
      unionId: "union-opseu",
      localId: "local-243",
      submittedById: "user-steward-243",
      submittedByName: "Local 243 Steward",
    });

    authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
    const crossUnion = await submitExpense(
      new Request("http://localhost"),
      params(foreign.id),
    );
    expect(crossUnion.status).toBe(404);
    expect(await crossUnion.json()).toEqual({ error: "Not found" });
    expect((await memoryExpenseStore.getById(foreign.id))?.status).toBe("draft");

    authMock.mockResolvedValue(
      session({ id: "user-other-steward", roles: ["local_steward"] }),
    );
    expect(
      (
        await submitExpense(new Request("http://localhost"), params(draft.id))
      ).status,
    ).toBe(403);

    authMock.mockResolvedValue(
      session({ id: "user-steward-243", roles: ["local_steward"] }),
    );
    const submitted = await submitExpense(
      new Request("http://localhost"),
      params(draft.id),
    );
    expect(submitted.status).toBe(200);
    const body = (await submitted.json()) as {
      submission: { status: string };
    };
    expect(body.submission.status).toBe("submitted");

    const retry = await submitExpense(
      new Request("http://localhost"),
      params(draft.id),
    );
    expect(retry.status).toBe(403);
  });
});
