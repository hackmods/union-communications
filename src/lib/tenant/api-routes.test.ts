import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as getTenant, POST as postTenant } from "@/app/api/tenant/route";
import { resetLocalPresentationPrefsForTests } from "@/lib/president/local-prefs";
import {
  resetTenantOverlayForTests,
  setEnabledModulesPatch,
} from "@/lib/tenant/overlay";
import { getPortalSurfacesForUnion } from "@/lib/tenant/portal-surfaces";

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

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

describe("GET/POST /api/tenant", () => {
  beforeEach(() => {
    authMock.mockReset();
    resetTenantOverlayForTests();
    resetLocalPresentationPrefsForTests();
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("DATA_DB_BACKEND", "memory");
  });

  afterEach(() => {
    resetTenantOverlayForTests();
    resetLocalPresentationPrefsForTests();
    vi.unstubAllEnvs();
  });

  it("GET returns 401 without a session and 400 without a union", async () => {
    authMock.mockResolvedValue(null);
    expect((await getTenant()).status).toBe(401);

    authMock.mockResolvedValue(session({ unionId: null }));
    const missing = await getTenant();
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ error: "Missing union context" });
  });

  it("GET lets a member read flags but not write", async () => {
    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    const res = await getTenant();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      canManageOnboarding: boolean;
      canManageUnionModules: boolean;
      canManageLocalModules: boolean;
      canCreateUnion: boolean;
    };
    expect(body.canManageOnboarding).toBe(false);
    expect(body.canManageUnionModules).toBe(false);
    expect(body.canManageLocalModules).toBe(false);
    expect(body.canCreateUnion).toBe(false);

    const written = await postTenant(
      jsonRequest({
        action: "set_modules",
        enabledModules: ["comms", "grievance", "portal"],
      }),
    );
    expect(written.status).toBe(403);
  });

  it("rejects invalid JSON and unknown actions", async () => {
    authMock.mockResolvedValue(session());
    const invalid = await postTenant({
      json: async () => {
        throw new SyntaxError("bad json");
      },
    } as unknown as Request);
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: "Invalid JSON" });

    const unknown = await postTenant(jsonRequest({ action: "wipe_union" }));
    expect(unknown.status).toBe(400);
  });

  it("forbids presidents from creating a union or enabling Data without Postgres", async () => {
    authMock.mockResolvedValue(session());
    const created = await postTenant(
      jsonRequest({ action: "create_union", name: "Hijack Union" }),
    );
    expect(created.status).toBe(403);

    const data = await postTenant(
      jsonRequest({ action: "set_data_module", enabled: true }),
    );
    expect(data.status).toBe(403);

    authMock.mockResolvedValue(
      session({ id: "user-union-admin", roles: ["union_admin"] }),
    );
    const enabled = await postTenant(
      jsonRequest({ action: "set_data_module", enabled: true }),
    );
    expect(enabled.status).toBe(503);
    expect(await enabled.json()).toEqual({
      error: "Set DATA_DB_BACKEND=postgres before enabling member data.",
    });
  });

  it("lets a president toggle Hub modules but keeps Data once an admin enabled it", async () => {
    setEnabledModulesPatch("union-b7p", [
      "comms",
      "grievance",
      "portal",
      "time",
      "data",
    ]);
    authMock.mockResolvedValue(session());

    const denied = await postTenant(
      jsonRequest({
        action: "set_modules",
        enabledModules: ["comms", "grievance", "portal", "data"],
      }),
    );
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({
      error: "UnionOps Data requires a union or platform admin.",
    });

    const updated = await postTenant(
      jsonRequest({
        action: "set_modules",
        enabledModules: ["comms", "grievance", "portal"],
      }),
    );
    expect(updated.status).toBe(200);
    const body = (await updated.json()) as {
      enabledModules: string[];
    };
    expect(body.enabledModules).toEqual(
      expect.arrayContaining(["comms", "grievance", "portal", "data"]),
    );
    expect(body.enabledModules).not.toContain("time");
  });

  it("lets a president set portal surfaces and same-union local prefs, not a foreign local", async () => {
    authMock.mockResolvedValue(session());
    const surfaces = await postTenant(
      jsonRequest({
        action: "set_portal_surfaces",
        portalSurfaces: ["announcements", "discussions"],
      }),
    );
    expect(surfaces.status).toBe(200);
    const surfaceBody = (await surfaces.json()) as {
      portalSurfaces: string[];
    };
    expect(surfaceBody.portalSurfaces).toEqual(
      expect.arrayContaining(["announcements", "discussions"]),
    );
    expect(getPortalSurfacesForUnion("union-b7p")).toEqual(
      surfaceBody.portalSurfaces,
    );

    const missing = await postTenant(
      jsonRequest({
        action: "set_local_prefs",
        localId: "local-missing",
        hubModules: ["grievance"],
        portalSurfaces: ["announcements"],
      }),
    );
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Local not found" });

    const prefs = await postTenant(
      jsonRequest({
        action: "set_local_prefs",
        localId: "local-7",
        hubModules: ["grievance", "portal"],
        portalSurfaces: ["announcements"],
      }),
    );
    expect(prefs.status).toBe(200);
    const prefsBody = (await prefs.json()) as {
      localPrefs: { hubModules: string[]; portalSurfaces: string[] };
    };
    expect(prefsBody.localPrefs.hubModules).toEqual(["grievance", "portal"]);
  });

  it("lets a president create a local on the session union overlay", async () => {
    authMock.mockResolvedValue(session());
    const created = await postTenant(
      jsonRequest({
        action: "create_local",
        localNumber: "808",
        subText: "Coverage local",
      }),
    );
    expect(created.status).toBe(201);
    const body = (await created.json()) as {
      local: { unionId: string; localNumber: string; subText: string };
    };
    expect(body.local.unionId).toBe("union-b7p");
    expect(body.local.localNumber).toBe("808");
    expect(body.local.subText).toBe("Coverage local");
  });
});
