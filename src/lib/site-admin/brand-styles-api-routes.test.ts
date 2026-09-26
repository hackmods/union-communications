import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as getUnionBrandPreset } from "@/app/api/me/union-brand-preset/route";
import { GET as getPublicHostBrand } from "@/app/api/host-brand/route";
import {
  GET as getBrandStyles,
  PATCH as patchBrandStyles,
} from "@/app/api/site-admin/brand-styles/route";
import { POST as postBrandBaseline } from "@/app/api/site-admin/brand-styles/baseline/route";
import {
  GET as getHostBrand,
  PATCH as patchHostBrand,
} from "@/app/api/site-admin/host-brand/route";
import { resetHostBrandStoreForTests } from "@/lib/brand/host-brand-store";
import { getTenantByUnionId } from "@/lib/tenant/loader";
import { resetTenantOverlayForTests } from "@/lib/tenant/overlay";

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

function invalidJsonRequest(): Request {
  return {
    json: async () => {
      throw new SyntaxError("Unexpected token");
    },
  } as Request;
}

const validTheme = {
  primaryColor: "#112233",
  secondaryColor: "#445566",
  accentColor: "#778899",
};

describe("site-admin brand-styles HTTP", () => {
  beforeEach(() => {
    authMock.mockReset();
    resetTenantOverlayForTests();
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("CUSTOMIZATION_ENABLED", "");
  });

  afterEach(() => {
    resetTenantOverlayForTests();
    vi.unstubAllEnvs();
  });

  it("returns 401 without a session and 403 for local officers", async () => {
    authMock.mockResolvedValue(null);
    expect((await getBrandStyles()).status).toBe(401);
    expect((await patchBrandStyles(jsonRequest({ unionId: "union-b7p" }))).status).toBe(
      401,
    );
    expect(
      (await postBrandBaseline(jsonRequest({ unionId: "union-b7p", brandTheme: validTheme }))).status,
    ).toBe(401);

    authMock.mockResolvedValue(session(["local_president"]));
    expect((await getBrandStyles()).status).toBe(403);
    expect(
      (await patchBrandStyles(jsonRequest({ unionId: "union-b7p", commsPresetId: "opseu" }))).status,
    ).toBe(403);
    expect(
      (await postBrandBaseline(jsonRequest({ unionId: "union-b7p", brandTheme: validTheme }))).status,
    ).toBe(403);
  });

  it("lists memory-mode unions for a platform operator", async () => {
    authMock.mockResolvedValue(session());
    const res = await getBrandStyles();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      unions: Array<{ id: string; commsPresetId: string | null }>;
      presets: Array<{ id: string }>;
    };
    expect(body.unions.some((row) => row.id === "union-b7p")).toBe(true);
    expect(body.presets.some((row) => row.id === "opseu")).toBe(true);
  });

  it("rejects invalid JSON, empty patches, and untrusted presets without writing", async () => {
    authMock.mockResolvedValue(session());
    expect((await patchBrandStyles(invalidJsonRequest())).status).toBe(400);

    const empty = await patchBrandStyles(jsonRequest({ unionId: "union-b7p" }));
    expect(empty.status).toBe(400);
    expect(await empty.json()).toMatchObject({
      error: "Provide slug, commsPresetId, and/or brandTheme",
    });

    const forged = await patchBrandStyles(
      jsonRequest({ unionId: "union-b7p", commsPresetId: "not-a-preset" }),
    );
    expect(forged.status).toBe(400);
    expect(await forged.json()).toEqual({ error: "Unknown Comms preset id" });
    expect(getTenantByUnionId("union-b7p")?.brandDefaults.commsPresetId).not.toBe(
      "not-a-preset",
    );
  });

  it("binds a trusted Comms preset on the session union in memory", async () => {
    authMock.mockResolvedValue(session());
    const res = await patchBrandStyles(
      jsonRequest({ unionId: "union-b7p", commsPresetId: "cupe" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      unionId: "union-b7p",
      commsPresetId: "cupe",
    });
    expect(getTenantByUnionId("union-b7p")?.brandDefaults.commsPresetId).toBe(
      "cupe",
    );
  });

  it("requires customization to be configured before drafting a baseline", async () => {
    authMock.mockResolvedValue(session());
    expect((await postBrandBaseline(invalidJsonRequest())).status).toBe(400);

    const missingTheme = await postBrandBaseline(jsonRequest({ unionId: "union-b7p" }));
    expect(missingTheme.status).toBe(400);

    const res = await postBrandBaseline(
      jsonRequest({ unionId: "union-b7p", brandTheme: validTheme }),
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Customization unavailable" });
  });
});

describe("site-admin host-brand HTTP", () => {
  beforeEach(() => {
    authMock.mockReset();
    resetHostBrandStoreForTests();
    vi.stubEnv("DATABASE_URL", "");
  });

  afterEach(() => {
    resetHostBrandStoreForTests();
    vi.unstubAllEnvs();
  });

  it("returns 401 without a session and 403 for local officers", async () => {
    authMock.mockResolvedValue(null);
    expect((await getHostBrand()).status).toBe(401);
    expect(
      (await patchHostBrand(jsonRequest({ primaryColor: "#111111" }))).status,
    ).toBe(401);

    authMock.mockResolvedValue(session(["local_president"]));
    expect((await getHostBrand()).status).toBe(403);
    expect(
      (
        await patchHostBrand(
          jsonRequest({
            primaryColor: "#111111",
            secondaryColor: "#222222",
            accentColor: "#333333",
          }),
        )
      ).status,
    ).toBe(403);
  });

  it("rejects invalid JSON, short hex, and untrusted presets", async () => {
    authMock.mockResolvedValue(session());
    expect((await patchHostBrand(invalidJsonRequest())).status).toBe(400);

    const shortHex = await patchHostBrand(
      jsonRequest({
        primaryColor: "#fff",
        secondaryColor: "#ffffff",
        accentColor: "#000000",
      }),
    );
    expect(shortHex.status).toBe(400);

    const forged = await patchHostBrand(
      jsonRequest({
        primaryColor: "#111111",
        secondaryColor: "#222222",
        accentColor: "#333333",
        unionPresetId: "not-a-preset",
      }),
    );
    expect(forged.status).toBe(400);
    expect(await forged.json()).toEqual({ error: "Unknown Comms preset id" });
  });

  it("saves and clears the durable overlay in memory", async () => {
    authMock.mockResolvedValue(session());
    const saved = await patchHostBrand(
      jsonRequest({
        primaryColor: "#112233",
        secondaryColor: "#445566",
        accentColor: "#778899",
        unionPresetId: "opseu",
        localNumber: "7",
      }),
    );
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({
      ok: true,
      brand: {
        primaryColor: "#112233",
        unionPresetId: "opseu",
        localNumber: "7",
      },
    });

    const cleared = await patchHostBrand(jsonRequest({ clear: true }));
    expect(cleared.status).toBe(200);
    const body = (await cleared.json()) as { ok: true; brand: { localNumber: string } };
    expect(body.ok).toBe(true);
    expect(body.brand.localNumber).not.toBe("7");
  });
});

describe("public and session brand lookup HTTP", () => {
  beforeEach(() => {
    authMock.mockReset();
    resetHostBrandStoreForTests();
    resetTenantOverlayForTests();
    vi.stubEnv("DATABASE_URL", "");
  });

  afterEach(() => {
    resetHostBrandStoreForTests();
    resetTenantOverlayForTests();
    vi.unstubAllEnvs();
  });

  it("exposes only public host-brand fields without a session", async () => {
    const res = await getPublicHostBrand();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("primaryColor");
    expect(body).toHaveProperty("localNumber");
    expect(body).not.toHaveProperty("payload");
    expect(JSON.stringify(body)).not.toMatch(/password|secret|token/i);
  });

  it("returns 401 for union-brand-preset without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await getUnionBrandPreset()).status).toBe(401);
  });

  it("resolves the signed-in union preset without accepting a client unionId", async () => {
    authMock.mockResolvedValue(session(["local_president"]));
    const res = await getUnionBrandPreset();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      unionId: "union-b7p",
    });
  });
});
