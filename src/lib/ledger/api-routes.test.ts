import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as listLedger, POST as createLedger } from "@/app/api/ledger/route";
import { GET as getLedger } from "@/app/api/ledger/[id]/route";
import {
  memoryLedgerStore,
  resetLedgerMemoryForTests,
} from "./memory-adapter";
import { resetLedgerStore } from "./store";

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
  return new Request(`http://localhost/api/ledger${query}`);
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const validCreate = {
  date: "2026-08-20",
  description: "Solidarity lunch refund",
  amount: 40,
  type: "income" as const,
  category: "social",
};

describe("ledger API routes", () => {
  beforeEach(() => {
    resetLedgerMemoryForTests();
    resetLedgerStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetLedgerMemoryForTests();
    resetLedgerStore();
  });

  describe("GET /api/ledger", () => {
    it("returns 401 without a session and 403 for members and stewards", async () => {
      authMock.mockResolvedValue(null);
      expect((await listLedger(listRequest())).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      expect((await listLedger(listRequest())).status).toBe(403);

      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      const forbidden = await listLedger(listRequest());
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("does not list another union or another local for a president", async () => {
      await memoryLedgerStore.create(
        {
          date: "2026-08-01",
          description: "Other union",
          amount: 99,
          type: "income",
          category: "fundraising",
        },
        {
          unionId: "union-other",
          localId: "local-243",
          recordedById: "user-x",
        },
      );
      await memoryLedgerStore.create(
        {
          date: "2026-08-02",
          description: "Other local",
          amount: 12,
          type: "expense",
          category: "social",
        },
        {
          unionId: "union-opseu",
          localId: "local-560",
          recordedById: "user-y",
        },
      );

      authMock.mockResolvedValue(session());
      const res = await listLedger(listRequest());
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        entries: Array<{ unionId: string; localId: string; description: string }>;
      };
      expect(body.entries.every((e) => e.unionId === "union-opseu")).toBe(true);
      expect(body.entries.every((e) => e.localId === "local-243")).toBe(true);
      expect(body.entries.map((e) => e.description)).not.toContain("Other union");
      expect(body.entries.map((e) => e.description)).not.toContain("Other local");
    });
  });

  describe("POST /api/ledger", () => {
    it("rejects forged tenant keys and stamps the session union/local", async () => {
      authMock.mockResolvedValue(session());
      const forged = await createLedger(
        jsonRequest({
          ...validCreate,
          unionId: "union-other",
          localId: "local-evil",
          recordedById: "attacker",
        }),
      );
      expect(forged.status).toBe(400);

      const created = await createLedger(jsonRequest(validCreate));
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        entry: {
          unionId: string;
          localId: string;
          recordedById: string;
          amount: number;
        };
      };
      expect(body.entry.unionId).toBe("union-opseu");
      expect(body.entry.localId).toBe("local-243");
      expect(body.entry.recordedById).toBe("user-president-243");
      expect(body.entry.amount).toBe(40);
    });

    it("returns 403 when a steward tries to create an entry", async () => {
      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      expect((await createLedger(jsonRequest(validCreate))).status).toBe(403);
    });

    it("returns 400 when the session has no local", async () => {
      authMock.mockResolvedValue(
        session({ roles: ["union_admin"], localId: null }),
      );
      const res = await createLedger(jsonRequest(validCreate));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Local required" });
    });
  });

  describe("GET /api/ledger/[id]", () => {
    it("returns 404 for a missing id and 403 for another union, including platform_admin", async () => {
      const foreign = await memoryLedgerStore.create(
        {
          date: "2026-08-01",
          description: "Other union",
          amount: 99,
          type: "income",
          category: "fundraising",
        },
        {
          unionId: "union-other",
          localId: "local-1",
          recordedById: "user-x",
        },
      );

      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const missing = await getLedger(
        new Request("http://localhost"),
        params("led-does-not-exist"),
      );
      expect(missing.status).toBe(404);

      const crossUnion = await getLedger(
        new Request("http://localhost"),
        params(foreign.id),
      );
      expect(crossUnion.status).toBe(403);
      expect(await crossUnion.json()).toEqual({ error: "Forbidden" });
    });
  });
});
