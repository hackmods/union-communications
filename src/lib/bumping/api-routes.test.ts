import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as listCases, POST as createCase } from "@/app/api/bumping/cases/route";
import {
  GET as getCase,
  PATCH as patchCase,
} from "@/app/api/bumping/cases/[id]/route";
import { POST as addNote } from "@/app/api/bumping/cases/[id]/notes/route";
import { POST as recordDecision } from "@/app/api/bumping/cases/[id]/decision/route";
import { POST as addSession } from "@/app/api/bumping/cases/[id]/sessions/route";
import { GET as rankSeniority } from "@/app/api/bumping/seniority/route";
import {
  memoryBumpingStore,
  resetBumpingMemoryForTests,
} from "./memory-adapter";
import { resetBumpingStore } from "./store";
import {
  createOverlayUnion,
  resetTenantOverlayForTests,
} from "@/lib/tenant/overlay";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  name?: string;
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

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const emptyPosition = {
  title: "",
  duties: "",
  qualifications: "",
  seniorityNotes: "",
};

const validCreate = {
  memberRef: "Member Test",
  seniorityDate: "2019-01-01",
  currentPosition: "Clerk II",
  targetPosition: "Clerk I (vacant)",
  scenario: "Layoff bump into a vacant lower classification",
};

async function seedForeignCase() {
  return memoryBumpingStore.create(
    {
      ...validCreate,
      memberRef: "Foreign member",
      incumbentPosition: emptyPosition,
      bumpingPosition: emptyPosition,
    },
    {
      unionId: "union-other",
      localId: "local-1",
      createdById: "user-other",
    },
  );
}

describe("bumping API routes", () => {
  beforeEach(() => {
    resetBumpingMemoryForTests();
    resetBumpingStore();
    resetTenantOverlayForTests();
    authMock.mockReset();
  });

  afterEach(() => {
    resetBumpingMemoryForTests();
    resetBumpingStore();
    resetTenantOverlayForTests();
  });

  describe("GET /api/bumping/cases", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect((await listCases()).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await listCases();
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("returns 403 when the bumping module is not enabled for the tenant", async () => {
      const tenant = createOverlayUnion({
        name: "Comms Only",
        enabledModules: ["comms", "grievance"],
        localNumber: "888",
      });
      authMock.mockResolvedValue(
        session({
          unionId: tenant.union.id,
          localId: tenant.locals![0]!.id,
        }),
      );
      const res = await listCases();
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Module not enabled" });
    });

    it("does not list another union, and a president does not see sister locals", async () => {
      await seedForeignCase();
      await memoryBumpingStore.create(
        {
          ...validCreate,
          memberRef: "Sister local member",
          incumbentPosition: emptyPosition,
          bumpingPosition: emptyPosition,
        },
        {
          unionId: "union-opseu",
          localId: "local-560",
          createdById: "user-president-560",
        },
      );

      authMock.mockResolvedValue(session());
      const res = await listCases();
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        cases: Array<{ memberRef: string; unionId: string; localId: string }>;
      };
      expect(body.cases.every((c) => c.unionId === "union-opseu")).toBe(true);
      expect(body.cases.every((c) => c.localId === "local-243")).toBe(true);
      expect(body.cases.map((c) => c.memberRef)).not.toContain("Foreign member");
      expect(body.cases.map((c) => c.memberRef)).not.toContain(
        "Sister local member",
      );
    });

    it("lets a union_admin without a local list sister locals in the same union only", async () => {
      await seedForeignCase();
      await memoryBumpingStore.create(
        {
          ...validCreate,
          memberRef: "Sister local member",
          incumbentPosition: emptyPosition,
          bumpingPosition: emptyPosition,
        },
        {
          unionId: "union-opseu",
          localId: "local-560",
          createdById: "user-president-560",
        },
      );

      authMock.mockResolvedValue(
        session({
          id: "user-union-admin",
          localId: null,
          roles: ["union_admin"],
        }),
      );
      const res = await listCases();
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        cases: Array<{ memberRef: string; unionId: string; localId: string }>;
      };
      expect(body.cases.every((c) => c.unionId === "union-opseu")).toBe(true);
      expect(body.cases.map((c) => c.memberRef)).toContain("Sister local member");
      expect(body.cases.map((c) => c.memberRef)).toContain("Member C");
      expect(body.cases.map((c) => c.memberRef)).not.toContain("Foreign member");
    });
  });

  describe("POST /api/bumping/cases", () => {
    it("rejects forged tenant keys and stamps the session union/local/author", async () => {
      authMock.mockResolvedValue(session());
      const forged = await createCase(
        jsonRequest({
          ...validCreate,
          unionId: "union-other",
          localId: "local-evil",
          createdById: "attacker",
        }),
      );
      expect(forged.status).toBe(400);

      const created = await createCase(jsonRequest(validCreate));
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        bumpingCase: {
          unionId: string;
          localId: string;
          createdById: string;
          memberRef: string;
          status: string;
        };
      };
      expect(body.bumpingCase.unionId).toBe("union-opseu");
      expect(body.bumpingCase.localId).toBe("local-243");
      expect(body.bumpingCase.createdById).toBe("user-president-243");
      expect(body.bumpingCase.memberRef).toBe("Member Test");
      expect(body.bumpingCase.status).toBe("open");
    });

    it("returns 400 when the session has no local", async () => {
      authMock.mockResolvedValue(
        session({ localId: null, roles: ["union_admin"] }),
      );
      const res = await createCase(jsonRequest(validCreate));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "Union and local context required",
      });
    });

    it("returns 403 when a steward or local_exec tries to create a case", async () => {
      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      expect((await createCase(jsonRequest(validCreate))).status).toBe(403);

      authMock.mockResolvedValue(session({ roles: ["local_exec"] }));
      expect((await createCase(jsonRequest(validCreate))).status).toBe(403);
    });

    it("lets a stability_member create a case", async () => {
      authMock.mockResolvedValue(
        session({
          id: "user-stability-243",
          name: "Stability Rep",
          roles: ["stability_member"],
        }),
      );
      const created = await createCase(jsonRequest(validCreate));
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        bumpingCase: { createdById: string };
      };
      expect(body.bumpingCase.createdById).toBe("user-stability-243");
    });
  });

  describe("GET/PATCH /api/bumping/cases/[id]", () => {
    it("returns 404 for a missing id", async () => {
      authMock.mockResolvedValue(session());
      const missing = await getCase(
        new Request("http://localhost"),
        params("bump-missing"),
      );
      expect(missing.status).toBe(404);
      expect(await missing.json()).toEqual({ error: "Not found" });
    });

    it("returns 403 for another union, including platform_admin, and does not mutate", async () => {
      const foreign = await seedForeignCase();

      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const viewed = await getCase(
        new Request("http://localhost"),
        params(foreign.bumpingCase.id),
      );
      expect(viewed.status).toBe(403);
      expect(await viewed.json()).toEqual({ error: "Forbidden" });

      const patched = await patchCase(
        jsonRequest({ status: "closed" }),
        params(foreign.bumpingCase.id),
      );
      expect(patched.status).toBe(403);
      expect(
        (await memoryBumpingStore.getById(foreign.bumpingCase.id))?.bumpingCase
          .status,
      ).toBe("open");
    });

    it("lets a steward and local_exec read a local case but not patch it", async () => {
      authMock.mockResolvedValue(
        session({ id: "user-steward-243", roles: ["local_steward"] }),
      );
      const viewed = await getCase(
        new Request("http://localhost"),
        params("bump-001"),
      );
      expect(viewed.status).toBe(200);
      const patched = await patchCase(
        jsonRequest({ status: "closed" }),
        params("bump-001"),
      );
      expect(patched.status).toBe(403);

      authMock.mockResolvedValue(
        session({ id: "user-exec-243", roles: ["local_exec"] }),
      );
      expect(
        (await getCase(new Request("http://localhost"), params("bump-001")))
          .status,
      ).toBe(200);
      expect(
        (await patchCase(jsonRequest({ status: "closed" }), params("bump-001")))
          .status,
      ).toBe(403);
      expect(
        (await memoryBumpingStore.getById("bump-001"))?.bumpingCase.status,
      ).toBe("in_review");
    });

    it("rejects extra tenant keys on PATCH then updates status from the session tenant", async () => {
      authMock.mockResolvedValue(session());
      const forged = await patchCase(
        jsonRequest({ status: "closed", unionId: "union-other" }),
        params("bump-001"),
      );
      expect(forged.status).toBe(400);

      const updated = await patchCase(
        jsonRequest({ status: "closed" }),
        params("bump-001"),
      );
      expect(updated.status).toBe(200);
      const body = (await updated.json()) as {
        bumpingCase: { status: string; unionId: string; localId: string };
      };
      expect(body.bumpingCase.status).toBe("closed");
      expect(body.bumpingCase.unionId).toBe("union-opseu");
      expect(body.bumpingCase.localId).toBe("local-243");
    });
  });

  describe("POST notes/decision/sessions", () => {
    it("rejects blank note bodies and stamps the session author, ignoring forged keys", async () => {
      authMock.mockResolvedValue(session());
      const blank = await addNote(
        jsonRequest({ body: "   " }),
        params("bump-001"),
      );
      expect(blank.status).toBe(400);
      expect(await blank.json()).toEqual({ error: "body is required" });

      const created = await addNote(
        jsonRequest({
          body: "Need HR clarification on supervisory duties.",
          authorId: "attacker",
          authorName: "Hacker",
        }),
        params("bump-001"),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        note: { authorId: string; authorName: string; body: string };
      };
      expect(body.note.authorId).toBe("user-president-243");
      expect(body.note.authorName).toBe("Local 243 President");
      expect(body.note.body).toBe(
        "Need HR clarification on supervisory duties.",
      );
    });

    it("requires outcome and rationale, then stamps recordedById from the session", async () => {
      authMock.mockResolvedValue(session());
      const missing = await recordDecision(
        jsonRequest({ outcome: "Proceed" }),
        params("bump-001"),
      );
      expect(missing.status).toBe(400);
      expect(await missing.json()).toEqual({
        error: "outcome and rationale are required",
      });

      const created = await recordDecision(
        jsonRequest({
          outcome: "Proceed with bump",
          rationale: "Seniority and qualifications verified.",
          recordedById: "attacker",
        }),
        params("bump-001"),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        decision: { recordedById: string; outcome: string };
      };
      expect(body.decision.recordedById).toBe("user-president-243");
      expect(body.decision.outcome).toBe("Proceed with bump");
      expect(
        (await memoryBumpingStore.getById("bump-001"))?.bumpingCase.status,
      ).toBe("decided");
    });

    it("requires date and agenda, then stamps createdById from the session", async () => {
      authMock.mockResolvedValue(session());
      const missing = await addSession(
        jsonRequest({ date: "2026-09-10" }),
        params("bump-001"),
      );
      expect(missing.status).toBe(400);
      expect(await missing.json()).toEqual({
        error: "date and agenda are required",
      });

      const created = await addSession(
        jsonRequest({
          date: "2026-09-10",
          agenda: "Review position descriptions",
          attendees: ["Chair"],
          createdById: "attacker",
        }),
        params("bump-001"),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        session: { createdById: string; agenda: string };
      };
      expect(body.session.createdById).toBe("user-president-243");
      expect(body.session.agenda).toBe("Review position descriptions");
    });

    it("returns 403 when a steward writes notes, decisions, or sessions", async () => {
      authMock.mockResolvedValue(
        session({ id: "user-steward-243", roles: ["local_steward"] }),
      );
      expect(
        (await addNote(jsonRequest({ body: "Nope" }), params("bump-001")))
          .status,
      ).toBe(403);
      expect(
        (
          await recordDecision(
            jsonRequest({ outcome: "X", rationale: "Y" }),
            params("bump-001"),
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await addSession(
            jsonRequest({ date: "2026-09-10", agenda: "Nope" }),
            params("bump-001"),
          )
        ).status,
      ).toBe(403);
    });

    it("returns 403 for another union's case, including platform_admin", async () => {
      const foreign = await seedForeignCase();
      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      expect(
        (
          await addNote(
            jsonRequest({ body: "Hijack" }),
            params(foreign.bumpingCase.id),
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await recordDecision(
            jsonRequest({ outcome: "X", rationale: "Y" }),
            params(foreign.bumpingCase.id),
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await addSession(
            jsonRequest({ date: "2026-09-10", agenda: "Hijack" }),
            params(foreign.bumpingCase.id),
          )
        ).status,
      ).toBe(403);
    });
  });

  describe("GET /api/bumping/seniority", () => {
    it("returns 401 without a session and 400 without classification", async () => {
      authMock.mockResolvedValue(null);
      expect(
        (
          await rankSeniority(
            new Request("http://localhost/api/bumping/seniority"),
          )
        ).status,
      ).toBe(401);

      authMock.mockResolvedValue(session());
      const missing = await rankSeniority(
        new Request("http://localhost/api/bumping/seniority"),
      );
      expect(missing.status).toBe(400);
      expect(await missing.json()).toEqual({
        error: "classification query parameter required",
      });
    });

    it("ranks only the session local and excludes inactive plus other locals", async () => {
      authMock.mockResolvedValue(session());
      const res = await rankSeniority(
        new Request(
          "http://localhost/api/bumping/seniority?classification=Administrative%20Assistant%20I",
        ),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        advisory: boolean;
        ranked: Array<{ memberRef: string; localId: string; active: boolean }>;
      };
      expect(body.advisory).toBe(true);
      expect(body.ranked.map((r) => r.memberRef)).toEqual([
        "Member A",
        "Member E",
        "Member B",
      ]);
      expect(body.ranked.every((r) => r.localId === "local-243")).toBe(true);
      expect(body.ranked.every((r) => r.active)).toBe(true);
      expect(body.ranked.map((r) => r.memberRef)).not.toContain(
        "Member Other Local",
      );
      expect(body.ranked.map((r) => r.memberRef)).not.toContain("Member D");
    });
  });
});
