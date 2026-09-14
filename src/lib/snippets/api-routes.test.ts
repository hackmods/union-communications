import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listSnippets,
  POST as createSnippet,
} from "@/app/api/snippets/route";
import {
  DELETE as deleteSnippet,
  GET as getSnippet,
  PATCH as patchSnippet,
} from "@/app/api/snippets/[id]/route";
import { resetSnippetMemoryForTests, snippetStore } from "./memory-adapter";

function session(input?: {
  id?: string;
  name?: string;
  unionId?: string | null;
  localId?: string | null;
  bargainingUnitId?: string;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-president-243",
      name: input?.name ?? "Local 243 President",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-opseu"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-243"),
      bargainingUnitId: input?.bargainingUnitId,
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
  return new Request(`http://localhost/api/snippets${query}`);
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const validCreate = {
  title: "Duty of fair representation",
  clauseRef: "Article 4.02",
  body: "The union shall represent all members fairly.",
  tags: ["dfr"],
};

describe("snippets API routes", () => {
  beforeEach(() => {
    resetSnippetMemoryForTests();
    authMock.mockReset();
  });

  afterEach(() => {
    resetSnippetMemoryForTests();
  });

  describe("GET /api/snippets", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect((await listSnippets(listRequest())).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await listSnippets(listRequest());
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("does not list another union or another local for a president", async () => {
      await snippetStore.create(
        {
          title: "Other union clause",
          clauseRef: "Art. 1",
          body: "Must never appear",
          localId: "local-243",
        },
        {
          unionId: "union-other",
          createdById: "user-x",
          createdByName: "X",
        },
      );
      await snippetStore.create(
        {
          title: "Other local clause",
          clauseRef: "Art. 2",
          body: "Same union, other local",
          localId: "local-560",
        },
        {
          unionId: "union-opseu",
          createdById: "user-y",
          createdByName: "Y",
        },
      );

      authMock.mockResolvedValue(session());
      const res = await listSnippets(listRequest());
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        snippets: Array<{ title: string; unionId: string; localId?: string }>;
      };
      expect(body.snippets.every((s) => s.unionId === "union-opseu")).toBe(true);
      expect(
        body.snippets.every((s) => !s.localId || s.localId === "local-243"),
      ).toBe(true);
      expect(body.snippets.map((s) => s.title)).not.toContain(
        "Other union clause",
      );
      expect(body.snippets.map((s) => s.title)).not.toContain(
        "Other local clause",
      );
    });

    it("filters by query", async () => {
      authMock.mockResolvedValue(session());
      const res = await listSnippets(listRequest("?q=just%20cause"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        snippets: Array<{ id: string; title: string }>;
      };
      expect(body.snippets.map((s) => s.id)).toContain("snip-001");
      expect(body.snippets.every((s) => /just cause/i.test(s.title))).toBe(
        true,
      );
    });
  });

  describe("POST /api/snippets", () => {
    it("rejects a missing body and stamps the session union/creator", async () => {
      authMock.mockResolvedValue(
        session({
          id: "user-steward-243",
          name: "Local 243 Steward",
          roles: ["local_steward"],
        }),
      );
      const missing = await createSnippet(
        jsonRequest({ title: "No clause", body: "Nope" }),
      );
      expect(missing.status).toBe(400);

      const created = await createSnippet(
        jsonRequest({
          ...validCreate,
          unionId: "union-other",
          createdById: "attacker",
        }),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        snippet: {
          unionId: string;
          localId?: string;
          createdById: string;
          title: string;
        };
      };
      expect(body.snippet.unionId).toBe("union-opseu");
      expect(body.snippet.localId).toBe("local-243");
      expect(body.snippet.createdById).toBe("user-steward-243");
      expect(body.snippet.title).toBe(validCreate.title);
    });

    it("returns 403 when a member or stability member tries to create", async () => {
      authMock.mockResolvedValue(session({ roles: ["stability_member"] }));
      expect((await createSnippet(jsonRequest(validCreate))).status).toBe(403);
    });

    it("returns 400 when the session has no union", async () => {
      authMock.mockResolvedValue(
        session({ unionId: null, roles: ["local_president"] }),
      );
      const res = await createSnippet(jsonRequest(validCreate));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Union required" });
    });
  });

  describe("GET/PATCH/DELETE /api/snippets/[id]", () => {
    it("returns 404 for a missing id and 403 for another union, including platform_admin", async () => {
      const foreign = await snippetStore.create(
        {
          title: "Foreign clause",
          clauseRef: "Art. 9",
          body: "Other union CA",
        },
        {
          unionId: "union-other",
          createdById: "user-other",
          createdByName: "Other",
        },
      );

      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const missing = await getSnippet(
        new Request("http://localhost"),
        params("snip-missing"),
      );
      expect(missing.status).toBe(404);

      const viewed = await getSnippet(
        new Request("http://localhost"),
        params(foreign.id),
      );
      expect(viewed.status).toBe(403);
      expect(await viewed.json()).toEqual({ error: "Forbidden" });

      const patched = await patchSnippet(
        jsonRequest({ title: "Hijacked", unionId: "union-opseu" }),
        params(foreign.id),
      );
      expect(patched.status).toBe(403);
      const stored = await snippetStore.getById(foreign.id);
      expect(stored?.title).toBe("Foreign clause");
      expect(stored?.unionId).toBe("union-other");

      const deleted = await deleteSnippet(
        new Request("http://localhost"),
        params(foreign.id),
      );
      expect(deleted.status).toBe(403);
      expect(await snippetStore.getById(foreign.id)).not.toBeNull();
    });

    it("ignores forged tenant keys on PATCH of an owned snippet", async () => {
      authMock.mockResolvedValue(
        session({
          id: "user-steward-243-pt",
          roles: ["local_steward"],
        }),
      );
      const patched = await patchSnippet(
        jsonRequest({
          title: "Updated additional hours",
          unionId: "union-other",
          localId: "local-evil",
          createdById: "attacker",
        }),
        params("snip-004"),
      );
      expect(patched.status).toBe(200);
      const body = (await patched.json()) as {
        snippet: {
          title: string;
          unionId: string;
          localId?: string;
          createdById: string;
        };
      };
      expect(body.snippet.title).toBe("Updated additional hours");
      expect(body.snippet.unionId).toBe("union-opseu");
      expect(body.snippet.localId).toBe("local-243");
      expect(body.snippet.createdById).toBe("user-steward-243-pt");
    });

    it("lets the author delete and forbids another steward", async () => {
      authMock.mockResolvedValue(
        session({ id: "user-steward-243", roles: ["local_steward"] }),
      );
      expect(
        (await deleteSnippet(new Request("http://localhost"), params("snip-004")))
          .status,
      ).toBe(403);
      expect(await snippetStore.getById("snip-004")).not.toBeNull();

      authMock.mockResolvedValue(
        session({ id: "user-steward-243-pt", roles: ["local_steward"] }),
      );
      const deleted = await deleteSnippet(
        new Request("http://localhost"),
        params("snip-004"),
      );
      expect(deleted.status).toBe(200);
      expect(await snippetStore.getById("snip-004")).toBeNull();
    });

    it("lets a president delete another officer's snippet", async () => {
      authMock.mockResolvedValue(session());
      const deleted = await deleteSnippet(
        new Request("http://localhost"),
        params("snip-004"),
      );
      expect(deleted.status).toBe(200);
      expect(await snippetStore.getById("snip-004")).toBeNull();
    });
  });
});
