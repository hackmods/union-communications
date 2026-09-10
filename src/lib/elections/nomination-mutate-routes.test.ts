import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  DELETE as deleteNomination,
  PATCH as patchNomination,
} from "@/app/api/elections/[id]/nominations/[nominationId]/route";
import {
  memoryElectionsStore,
  resetElectionsMemoryForTests,
} from "./memory-adapter";
import { resetElectionsStore } from "./store";

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

function params(id: string, nominationId: string) {
  return { params: Promise.resolve({ id, nominationId }) };
}

describe("election nomination PATCH/DELETE", () => {
  beforeEach(() => {
    resetElectionsMemoryForTests();
    resetElectionsStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetElectionsMemoryForTests();
    resetElectionsStore();
  });

  it("returns 401 without a session and 403 for members and stewards", async () => {
    authMock.mockResolvedValue(null);
    expect(
      (
        await patchNomination(
          jsonRequest({ status: "accepted" }),
          params("elec-001", "nom-002"),
        )
      ).status,
    ).toBe(401);

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    expect(
      (
        await patchNomination(
          jsonRequest({ status: "accepted" }),
          params("elec-001", "nom-002"),
        )
      ).status,
    ).toBe(403);

    authMock.mockResolvedValue(
      session({ id: "user-steward-243", roles: ["local_steward"] }),
    );
    const steward = await deleteNomination(
      new Request("http://localhost"),
      params("elec-001", "nom-002"),
    );
    expect(steward.status).toBe(403);
    expect(await steward.json()).toEqual({ error: "Forbidden" });
  });

  it("returns 404 for a missing cycle and 403 for another union, including platform_admin", async () => {
    const foreign = await memoryElectionsStore.create(
      { title: "Other union vote", positions: ["President"] },
      { unionId: "union-other", localId: "local-1" },
    );
    const withNom = await memoryElectionsStore.addNomination(foreign.id, {
      position: "President",
      nomineeName: "Pat",
    });
    const nomId = withNom?.nominations[0]?.id;
    if (!nomId) throw new Error("expected foreign nomination");

    authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
    expect(
      (
        await patchNomination(
          jsonRequest({ status: "accepted" }),
          params("elec-missing", "nom-002"),
        )
      ).status,
    ).toBe(404);

    const crossUnion = await patchNomination(
      jsonRequest({ status: "accepted" }),
      params(foreign.id, nomId),
    );
    expect(crossUnion.status).toBe(403);
    expect(await crossUnion.json()).toEqual({ error: "Forbidden" });
  });

  it("returns 403 for a sister-local president", async () => {
    authMock.mockResolvedValue(
      session({
        id: "user-president-560",
        localId: "local-560",
        roles: ["local_president"],
      }),
    );
    const res = await patchNomination(
      jsonRequest({ status: "accepted" }),
      params("elec-001", "nom-002"),
    );
    expect(res.status).toBe(403);
  });

  it("rejects extra keys, 404s a missing nomination, then accepts a status change", async () => {
    authMock.mockResolvedValue(session());
    const extra = await patchNomination(
      jsonRequest({ status: "accepted", unionId: "union-other" }),
      params("elec-001", "nom-002"),
    );
    expect(extra.status).toBe(400);

    expect(
      (
        await patchNomination(
          jsonRequest({ status: "accepted" }),
          params("elec-001", "nom-missing"),
        )
      ).status,
    ).toBe(404);

    const patched = await patchNomination(
      jsonRequest({ status: "accepted" }),
      params("elec-001", "nom-002"),
    );
    expect(patched.status).toBe(200);
    const body = (await patched.json()) as {
      cycle: { nominations: Array<{ id: string; status: string }> };
    };
    expect(
      body.cycle.nominations.find((n) => n.id === "nom-002")?.status,
    ).toBe("accepted");
  });

  it("lets a president delete a nomination and leaves the rest", async () => {
    authMock.mockResolvedValue(session());
    const res = await deleteNomination(
      new Request("http://localhost"),
      params("elec-001", "nom-002"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      cycle: { nominations: Array<{ id: string }> };
    };
    const ids = body.cycle.nominations.map((n) => n.id);
    expect(ids).toContain("nom-001");
    expect(ids).not.toContain("nom-002");
  });
});
