import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listTemplates,
  POST as createTemplate,
} from "@/app/api/marketplace/route";
import {
  DELETE as deleteTemplate,
  GET as getTemplate,
} from "@/app/api/marketplace/[id]/route";
import {
  marketplaceStore,
  resetMarketplaceMemoryForTests,
} from "./memory-adapter";

function session(input?: {
  id?: string;
  name?: string;
  unionId?: string | null;
  localId?: string | null;
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
  return new Request(`http://localhost/api/marketplace${query}`);
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const validCreate = {
  kind: "email",
  title: "Step 2 follow-up",
  description: "After the meeting",
  body: "Please confirm the Step 2 date.",
};

describe("marketplace API routes", () => {
  beforeEach(() => {
    resetMarketplaceMemoryForTests();
    authMock.mockReset();
  });

  afterEach(() => {
    resetMarketplaceMemoryForTests();
  });

  describe("GET /api/marketplace", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect((await listTemplates(listRequest())).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await listTemplates(listRequest());
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("returns 400 when the session has no union", async () => {
      authMock.mockResolvedValue(session({ unionId: null }));
      const res = await listTemplates(listRequest());
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Union required" });
    });

    it("never lists another union and still shares other locals in the same union", async () => {
      await marketplaceStore.create(
        {
          kind: "other",
          title: "Other union leak",
          description: "must not list",
          body: "secret",
        },
        {
          unionId: "union-other",
          localId: "local-243",
          sharedById: "user-x",
          sharedByName: "Other",
        },
      );
      const otherLocal = await marketplaceStore.create(
        {
          kind: "checklist",
          title: "Sister local intake",
          description: "same union",
          body: "Share within the union.",
        },
        {
          unionId: "union-opseu",
          localId: "local-560",
          sharedById: "user-y",
          sharedByName: "560 President",
        },
      );

      authMock.mockResolvedValue(session());
      const res = await listTemplates(listRequest());
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        templates: Array<{ id: string; unionId: string; localId: string; title: string }>;
      };
      expect(body.templates.every((t) => t.unionId === "union-opseu")).toBe(true);
      expect(body.templates.map((t) => t.title)).not.toContain("Other union leak");
      expect(body.templates.some((t) => t.id === otherLocal.id)).toBe(true);
    });

    it("filters by kind and q", async () => {
      authMock.mockResolvedValue(session());
      const emails = await listTemplates(listRequest("?kind=email"));
      expect(emails.status).toBe(200);
      const emailBody = (await emails.json()) as {
        templates: Array<{ kind: string }>;
      };
      expect(emailBody.templates.length).toBeGreaterThan(0);
      expect(emailBody.templates.every((t) => t.kind === "email")).toBe(true);

      const search = await listTemplates(listRequest("?q=just%20cause"));
      expect(search.status).toBe(200);
      const searchBody = (await search.json()) as {
        templates: Array<{ title: string }>;
      };
      expect(searchBody.templates).toEqual([]);

      const caption = await listTemplates(listRequest("?q=bargaining%20update"));
      const captionBody = (await caption.json()) as {
        templates: Array<{ id: string }>;
      };
      expect(captionBody.templates.map((t) => t.id)).toContain("tmpl-003");
    });
  });

  describe("POST /api/marketplace", () => {
    it("rejects missing fields then stamps session union/local/author even when the body forges tenant keys", async () => {
      authMock.mockResolvedValue(session());
      const missing = await createTemplate(jsonRequest({ title: "Nope" }));
      expect(missing.status).toBe(400);
      expect(await missing.json()).toEqual({
        error: "kind, title, and body are required",
      });

      const forged = await createTemplate(
        jsonRequest({
          ...validCreate,
          unionId: "union-other",
          localId: "local-evil",
          sharedById: "attacker",
          sharedByName: "Attacker",
        }),
      );
      expect(forged.status).toBe(201);
      const body = (await forged.json()) as {
        template: {
          unionId: string;
          localId: string;
          sharedById: string;
          sharedByName: string;
          title: string;
        };
      };
      expect(body.template.unionId).toBe("union-opseu");
      expect(body.template.localId).toBe("local-243");
      expect(body.template.sharedById).toBe("user-president-243");
      expect(body.template.sharedByName).toBe("Local 243 President");
      expect(body.template.title).toBe("Step 2 follow-up");
    });

    it("lets a steward publish and forbids local_exec and members", async () => {
      authMock.mockResolvedValue(
        session({
          id: "user-steward-243",
          name: "Local 243 Steward",
          roles: ["local_steward"],
        }),
      );
      const created = await createTemplate(jsonRequest(validCreate));
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        template: { sharedById: string };
      };
      expect(body.template.sharedById).toBe("user-steward-243");

      authMock.mockResolvedValue(session({ roles: ["local_exec"] }));
      expect((await createTemplate(jsonRequest(validCreate))).status).toBe(403);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      expect((await createTemplate(jsonRequest(validCreate))).status).toBe(403);
    });

    it("returns 400 when union or local is missing", async () => {
      authMock.mockResolvedValue(session({ localId: null }));
      const res = await createTemplate(jsonRequest(validCreate));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Union and local required" });
    });
  });

  describe("GET /api/marketplace/[id]", () => {
    it("returns 404 for a missing id and 403 for another union, including platform_admin", async () => {
      const foreign = await marketplaceStore.create(
        {
          kind: "other",
          title: "Foreign",
          description: "",
          body: "no",
        },
        {
          unionId: "union-other",
          localId: "local-1",
          sharedById: "user-x",
          sharedByName: "Other",
        },
      );

      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const missing = await getTemplate(
        new Request("http://localhost"),
        params("tmpl-does-not-exist"),
      );
      expect(missing.status).toBe(404);

      const crossUnion = await getTemplate(
        new Request("http://localhost"),
        params(foreign.id),
      );
      expect(crossUnion.status).toBe(403);
      expect(await crossUnion.json()).toEqual({ error: "Forbidden" });
    });

    it("lets an officer download a sister-local template in the same union", async () => {
      const sister = await marketplaceStore.create(
        {
          kind: "email",
          title: "560 opener",
          description: "",
          body: "Hello",
        },
        {
          unionId: "union-opseu",
          localId: "local-560",
          sharedById: "user-y",
          sharedByName: "560",
        },
      );

      authMock.mockResolvedValue(session());
      const res = await getTemplate(
        new Request("http://localhost"),
        params(sister.id),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        template: { id: string; localId: string };
      };
      expect(body.template.id).toBe(sister.id);
      expect(body.template.localId).toBe("local-560");
    });
  });

  describe("DELETE /api/marketplace/[id]", () => {
    it("returns 401 without a session and 403 for members and local_exec", async () => {
      authMock.mockResolvedValue(null);
      expect(
        (await deleteTemplate(new Request("http://localhost"), params("tmpl-001")))
          .status,
      ).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      expect(
        (await deleteTemplate(new Request("http://localhost"), params("tmpl-001")))
          .status,
      ).toBe(403);

      authMock.mockResolvedValue(session({ roles: ["local_exec"] }));
      expect(
        (await deleteTemplate(new Request("http://localhost"), params("tmpl-001")))
          .status,
      ).toBe(403);
    });

    it("lets a steward delete their own template but not another officer's", async () => {
      authMock.mockResolvedValue(
        session({
          id: "user-steward-243",
          name: "Local 243 Steward",
          roles: ["local_steward"],
        }),
      );
      const others = await deleteTemplate(
        new Request("http://localhost"),
        params("tmpl-001"),
      );
      expect(others.status).toBe(403);

      const own = await deleteTemplate(
        new Request("http://localhost"),
        params("tmpl-003"),
      );
      expect(own.status).toBe(200);
      expect(await marketplaceStore.getById("tmpl-003")).toBeNull();
    });

    it("lets a president delete another officer's template", async () => {
      authMock.mockResolvedValue(session());
      const res = await deleteTemplate(
        new Request("http://localhost"),
        params("tmpl-003"),
      );
      expect(res.status).toBe(200);
      expect(await marketplaceStore.getById("tmpl-003")).toBeNull();
    });

    it("returns 404 for a missing id and 403 for another union with no write", async () => {
      const foreign = await marketplaceStore.create(
        {
          kind: "other",
          title: "Foreign",
          description: "",
          body: "no",
        },
        {
          unionId: "union-other",
          localId: "local-1",
          sharedById: "user-x",
          sharedByName: "Other",
        },
      );

      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      expect(
        (
          await deleteTemplate(
            new Request("http://localhost"),
            params("tmpl-missing"),
          )
        ).status,
      ).toBe(404);

      const crossUnion = await deleteTemplate(
        new Request("http://localhost"),
        params(foreign.id),
      );
      expect(crossUnion.status).toBe(403);
      expect(await marketplaceStore.getById(foreign.id)).not.toBeNull();
    });
  });
});
