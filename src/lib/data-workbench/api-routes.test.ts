import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as listDatasets, POST as createDataset } from "@/app/api/data/datasets/route";
import { GET as listImports, POST as createImport } from "@/app/api/data/imports/route";
import { GET as listPeople } from "@/app/api/data/records/people/route";
import {
  createOverlayUnion,
  resetTenantOverlayForTests,
} from "@/lib/tenant/overlay";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-president-7",
      name: "Local 777 President",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-b7p"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-7"),
      roles: input?.roles ?? (["local_president"] as UserRole[]),
    },
  };
}

describe("UnionOps Data HTTP access", () => {
  beforeEach(() => {
    authMock.mockReset();
    resetTenantOverlayForTests();
  });

  afterEach(() => {
    resetTenantOverlayForTests();
  });

  it("returns 401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await listDatasets()).status).toBe(401);
    expect((await listImports()).status).toBe(401);
    expect(
      (await listPeople(new Request("http://localhost/api/data/records/people"))).status,
    ).toBe(401);
  });

  it("returns 404 for members and stewards when Data is not enabled", async () => {
    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    const member = await listDatasets();
    expect(member.status).toBe(404);
    expect(await member.json()).toEqual({
      error: "UnionOps Data is not enabled for this union.",
    });

    authMock.mockResolvedValue(
      session({ id: "user-steward-7", roles: ["local_steward"] }),
    );
    const steward = await createDataset({
      json: async () => ({ name: "Roster", kind: "member_employment" }),
    } as Request);
    expect(steward.status).toBe(404);
  });

  it("returns 403 when no local is selected", async () => {
    authMock.mockResolvedValue(session({ localId: null }));
    const res = await listDatasets();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "Select a local to use UnionOps Data.",
    });
  });

  it("returns 404 when the Data module is not enabled for the union", async () => {
    authMock.mockResolvedValue(session());
    const res = await listDatasets();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: "UnionOps Data is not enabled for this union.",
    });
  });

  it("does not accept an import when Data is not enabled", async () => {
    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    const res = await createImport(new Request("http://localhost/api/data/imports", { method: "POST" }));
    expect(res.status).toBe(404);
  });

  it("fails closed with 503 when Data is enabled but Postgres is not configured", async () => {
    const tenant = createOverlayUnion({
      name: "Data Enabled Union",
      enabledModules: ["comms", "data"],
      localNumber: "88",
    });
    authMock.mockResolvedValue(
      session({
        unionId: tenant.union.id,
        localId: tenant.locals![0]!.id,
      }),
    );
    const listed = await listDatasets();
    expect(listed.status).toBe(503);
    expect(await listed.json()).toEqual({
      error:
        "UnionOps Data requires durable PostgreSQL storage. Ask your instance operator to enable DATA_DB_BACKEND=postgres.",
    });

    const created = await createDataset({
      json: async () => ({ name: "Roster", kind: "member_employment" }),
    } as Request);
    expect(created.status).toBe(503);

    authMock.mockResolvedValue(
      session({
        id: "user-steward-data",
        unionId: tenant.union.id,
        localId: tenant.locals![0]!.id,
        roles: ["local_steward"],
      }),
    );
    const steward = await listDatasets();
    expect(steward.status).toBe(403);
    expect(await steward.json()).toEqual({ error: "Forbidden" });
  });
});
