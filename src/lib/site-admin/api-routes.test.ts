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
