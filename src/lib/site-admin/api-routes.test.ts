import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock, setUserRolesMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  setUserRolesMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/site-admin/set-user-roles", () => ({
  setUserRoles: setUserRolesMock,
}));

import { POST as purgeDemo } from "@/app/api/site-admin/demo/purge/route";
import { GET as previewDemo } from "@/app/api/site-admin/demo/preview/route";
import { POST as createUnion } from "@/app/api/site-admin/unions/route";
import { PATCH as patchUnion } from "@/app/api/site-admin/unions/[id]/route";
import { POST as createLocal } from "@/app/api/site-admin/locals/route";
import { POST as archiveLocal } from "@/app/api/site-admin/locals/[id]/archive/route";
import { POST as restoreLocal } from "@/app/api/site-admin/locals/[id]/restore/route";
import { POST as assignLocal } from "@/app/api/site-admin/users/[id]/assign-local/route";
import { PATCH as patchRoles } from "@/app/api/site-admin/users/[id]/roles/route";
import { GET as scanMembershipIntegrity } from "@/app/api/site-admin/membership-integrity/route";
import { GET as tenantOptions } from "@/app/api/site-admin/tenant-options/route";
import { GET as operatorAudit } from "@/app/api/site-admin/audit/route";
import { DEMO_PURGE_CONFIRM_PHRASE } from "./demo-purge";

function session(roles: UserRole[] = ["platform_admin"]) {
  return {
    user: {
      id: "user-platform-admin",
      name: "Operator",
      unionId: "union-b7p",
      localId: "local-7",
      roles,
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

describe("site-admin demo purge HTTP", () => {
  beforeEach(() => {
    authMock.mockReset();
    vi.stubEnv("DATABASE_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 without a session and 403 for local officers", async () => {
    authMock.mockResolvedValue(null);
    expect((await purgeDemo(jsonRequest({}))).status).toBe(401);
    expect((await previewDemo()).status).toBe(401);

    authMock.mockResolvedValue(session(["local_president"]));
    const forbidden = await purgeDemo(
      jsonRequest({ confirm: DEMO_PURGE_CONFIRM_PHRASE, password: "secret" }),
    );
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "Forbidden" });
  });

  it("returns 404 when demo purge is disabled for platform operators", async () => {
    authMock.mockResolvedValue(session());
    const res = await purgeDemo(
      jsonRequest({ confirm: DEMO_PURGE_CONFIRM_PHRASE, password: "secret" }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 503 for a platform operator when Postgres is not configured", async () => {
    vi.stubEnv("SITE_ADMIN_DEMO_PURGE_ENABLED", "true");
    authMock.mockResolvedValue(session());
    const res = await purgeDemo(
      jsonRequest({ confirm: DEMO_PURGE_CONFIRM_PHRASE, password: "secret" }),
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Postgres is not configured" });
  });
});

describe("site-admin unions HTTP", () => {
  beforeEach(() => {
    authMock.mockReset();
    vi.stubEnv("DATABASE_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("create union returns 503 without Postgres", async () => {
    authMock.mockResolvedValue(session());
    const res = await createUnion(jsonRequest({ name: "New Union" }));
    expect(res.status).toBe(503);
  });

  it("patch membership policy returns 503 without Postgres", async () => {
    authMock.mockResolvedValue(session());
    const res = await patchUnion(jsonRequest({ membershipPolicy: "single_local" }), {
      params: Promise.resolve({ id: "union-1" }),
    });
    expect(res.status).toBe(503);
  });

  it("create union rejects non-platform officers", async () => {
    authMock.mockResolvedValue(session(["local_president"]));
    const res = await createUnion(jsonRequest({ name: "New Union" }));
    expect(res.status).toBe(403);
  });
});

describe("site-admin locals, assign-local, and integrity HTTP", () => {
  beforeEach(() => {
    authMock.mockReset();
    vi.stubEnv("DATABASE_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function userParams(id: string) {
    return { params: Promise.resolve({ id }) };
  }

  it("returns 401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect(
      (await createLocal(jsonRequest({ unionId: "union-b7p", localNumber: "8" })))
        .status,
    ).toBe(401);
    expect(
      (
        await patchRoles(jsonRequest({ roles: ["local_steward"] }), userParams("user-1"))
      ).status,
    ).toBe(401);
    expect(
      (await assignLocal(jsonRequest({ localId: "local-7" }), userParams("user-1")))
        .status,
    ).toBe(401);
    expect((await scanMembershipIntegrity()).status).toBe(401);
    expect((await tenantOptions()).status).toBe(401);
    expect(
      (await archiveLocal(new Request("http://localhost"), userParams("local-7")))
        .status,
    ).toBe(401);
    expect(
      (await restoreLocal(new Request("http://localhost"), userParams("local-7")))
        .status,
    ).toBe(401);
  });

  it("returns 403 for local officers", async () => {
    authMock.mockResolvedValue(session(["local_president"]));
    expect(
      (await createLocal(jsonRequest({ unionId: "union-b7p", localNumber: "8" })))
        .status,
    ).toBe(403);
    expect(
      (await assignLocal(jsonRequest({ localId: "local-7" }), userParams("user-1")))
        .status,
    ).toBe(403);
    const integrity = await scanMembershipIntegrity();
    expect(integrity.status).toBe(403);
    expect(await integrity.json()).toEqual({ error: "Forbidden" });
    expect((await tenantOptions()).status).toBe(403);
    expect(
      (await archiveLocal(new Request("http://localhost"), userParams("local-7")))
        .status,
    ).toBe(403);
    expect(
      (await restoreLocal(new Request("http://localhost"), userParams("local-7")))
        .status,
    ).toBe(403);
    expect(
      (
        await patchRoles(jsonRequest({ roles: ["local_steward"] }), userParams("user-1"))
      ).status,
    ).toBe(403);
  });

  it("fails closed without Postgres for mutating and scan routes", async () => {
    authMock.mockResolvedValue(session());
    const local = await createLocal(
      jsonRequest({ unionId: "union-b7p", localNumber: "8" }),
    );
    expect(local.status).toBe(503);
    expect(await local.json()).toEqual({ error: "Postgres is not configured" });

    const assigned = await assignLocal(
      jsonRequest({ localId: "local-7" }),
      userParams("user-1"),
    );
    expect(assigned.status).toBe(503);

    const roles = await patchRoles(
      jsonRequest({ roles: ["local_steward"] }),
      userParams("user-1"),
    );
    expect(roles.status).toBe(503);

    const integrity = await scanMembershipIntegrity();
    expect(integrity.status).toBe(503);
    expect(await integrity.json()).toEqual({
      error: "Postgres is not configured",
      issues: [],
      highCount: 0,
    });

    const options = await tenantOptions();
    expect(options.status).toBe(200);
    expect(await options.json()).toEqual({
      unions: [],
      locals: [],
      subGroups: [],
    });
  });

  it("rejects a missing local id before touching the database", async () => {
    authMock.mockResolvedValue(session());
    expect(
      (await archiveLocal(new Request("http://localhost"), userParams(""))).status,
    ).toBe(400);
    expect(
      (await restoreLocal(new Request("http://localhost"), userParams(""))).status,
    ).toBe(400);
  });
});

describe("site-admin operator audit HTTP", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("returns 401 without a session and 403 for non-platform officers", async () => {
    authMock.mockResolvedValue(null);
    expect(
      (await operatorAudit(new Request("http://localhost/api/site-admin/audit"))).status,
    ).toBe(401);

    authMock.mockResolvedValue(session(["local_president"]));
    expect(
      (await operatorAudit(new Request("http://localhost/api/site-admin/audit"))).status,
    ).toBe(403);
  });

  it("returns entries for platform_admin", async () => {
    authMock.mockResolvedValue(session());
    const res = await operatorAudit(
      new Request("http://localhost/api/site-admin/audit?limit=10"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entries: unknown[] };
    expect(Array.isArray(body.entries)).toBe(true);
  });
});

describe("PATCH /api/site-admin/users/[id]/roles validation", () => {
  function userParams(id: string) {
    return { params: Promise.resolve({ id }) };
  }

  beforeEach(() => {
    authMock.mockReset();
    setUserRolesMock.mockReset();
    vi.stubEnv("DATABASE_URL", "postgres://roles-validation-test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a missing user id and invalid bodies before writing roles", async () => {
    authMock.mockResolvedValue(session());

    const missingId = await patchRoles(
      jsonRequest({ roles: ["local_steward"] }),
      userParams(""),
    );
    expect(missingId.status).toBe(400);
    expect(await missingId.json()).toEqual({ error: "Missing user id" });

    const invalidJson = await patchRoles(
      {
        json: async () => {
          throw new SyntaxError("bad json");
        },
      } as unknown as Request,
      userParams("user-1"),
    );
    expect(invalidJson.status).toBe(400);
    expect(await invalidJson.json()).toEqual({ error: "Invalid JSON" });

    const emptyRoles = await patchRoles(
      jsonRequest({ roles: [] }),
      userParams("user-1"),
    );
    expect(emptyRoles.status).toBe(400);

    const forgedRole = await patchRoles(
      jsonRequest({ roles: ["superuser"] }),
      userParams("user-1"),
    );
    expect(forgedRole.status).toBe(400);
    expect(setUserRolesMock).not.toHaveBeenCalled();
  });

  it("passes only parsed roles to the writer", async () => {
    authMock.mockResolvedValue(session());
    setUserRolesMock.mockResolvedValue({
      ok: true,
      roles: ["local_steward", "local_exec"],
      sessionVersion: 4,
    });

    const res = await patchRoles(
      jsonRequest({
        roles: ["local_steward", "local_exec", "local_steward"],
        unionId: "union-other",
      }),
      userParams("user-1"),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      roles: ["local_steward", "local_exec"],
      sessionVersion: 4,
    });
    expect(setUserRolesMock).toHaveBeenCalledWith({
      actorUserId: "user-platform-admin",
      targetUserId: "user-1",
      roles: ["local_steward", "local_exec", "local_steward"],
    });
  });
});
