import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { POST as purgeDemo } from "@/app/api/site-admin/demo/purge/route";
import { GET as previewDemo } from "@/app/api/site-admin/demo/preview/route";
import { POST as createUnion } from "@/app/api/site-admin/unions/route";
import { PATCH as patchUnion } from "@/app/api/site-admin/unions/[id]/route";
import { POST as createLocal } from "@/app/api/site-admin/locals/route";
import { POST as archiveLocal } from "@/app/api/site-admin/locals/[id]/archive/route";
import { POST as restoreLocal } from "@/app/api/site-admin/locals/[id]/restore/route";
import { POST as assignLocal } from "@/app/api/site-admin/users/[id]/assign-local/route";
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
