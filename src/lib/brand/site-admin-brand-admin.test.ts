import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requireSiteAdminSession } = vi.hoisted(() => ({
  requireSiteAdminSession: vi.fn(),
}));

vi.mock("@/lib/auth/site-admin-session", () => ({
  requireSiteAdminSession,
}));

import {
  DELETE as deleteBinding,
  GET as getBindings,
  PUT as putBinding,
} from "@/app/api/site-admin/preset-bindings/route";
import {
  DELETE as archivePreset,
  GET as getPresets,
  PUT as putPreset,
} from "@/app/api/site-admin/comms-presets/route";
import { resetPresetBindingsForTests } from "@/lib/brand/preset-bindings-store";
import { resetCommsPresetCatalogForTests } from "@/lib/brand/comms-preset-catalog";

function adminOk() {
  requireSiteAdminSession.mockResolvedValue({
    ok: true,
    session: {
      user: {
        id: "platform-1",
        roles: ["platform_admin"],
      },
    },
  });
}

function jsonRequest(body: unknown, url = "http://localhost/api"): Request {
  return {
    json: async () => body,
    url,
  } as Request;
}

describe("/api/site-admin/preset-bindings", () => {
  beforeEach(() => {
    requireSiteAdminSession.mockReset();
    resetPresetBindingsForTests();
  });
  afterEach(() => {
    resetPresetBindingsForTests();
  });

  it("requires site admin", async () => {
    requireSiteAdminSession.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    expect((await getBindings(jsonRequest({}))).status).toBe(401);
  });

  it("creates and lists published bindings", async () => {
    adminOk();
    const saved = await putBinding(
      jsonRequest({
        presetId: "opseu",
        sectorId: "caat-support",
        unionId: "union-b7p",
        scopeId: "union-b7p",
      }),
    );
    expect(saved.status).toBe(200);
    const listed = await getBindings(
      jsonRequest({}, "http://localhost/api?unionId=union-b7p"),
    );
    const body = (await listed.json()) as {
      bindings: Array<{ presetId: string; sectorId: string }>;
    };
    expect(body.bindings).toHaveLength(1);
    expect(body.bindings[0]?.presetId).toBe("opseu");

    const removed = await deleteBinding(
      jsonRequest({ presetId: "opseu", sectorId: "caat-support" }),
    );
    expect(removed.status).toBe(200);
  });

  it("rejects unknown presets", async () => {
    adminOk();
    const bad = await putBinding(
      jsonRequest({
        presetId: "not-real",
        unionId: "union-b7p",
        scopeId: "union-b7p",
      }),
    );
    expect(bad.status).toBe(400);
  });
});

describe("/api/site-admin/comms-presets", () => {
  beforeEach(() => {
    requireSiteAdminSession.mockReset();
    resetCommsPresetCatalogForTests();
  });
  afterEach(() => {
    resetCommsPresetCatalogForTests();
  });

  it("creates durable presets and archives them", async () => {
    adminOk();
    const saved = await putPreset(
      jsonRequest({
        id: "custom-local",
        name: "Custom Local",
        primaryColor: "#ABCDEF",
        secondaryColor: "#FFFFFF",
        accentColor: "#123456",
        defaultSlogans: ["Together"],
      }),
    );
    expect(saved.status).toBe(200);
    const listed = await getPresets();
    const body = (await listed.json()) as {
      durable: Array<{ id: string }>;
      merged: Array<{ id: string }>;
    };
    expect(body.durable.some((p) => p.id === "custom-local")).toBe(true);
    expect(body.merged.some((p) => p.id === "custom-local")).toBe(true);

    const archived = await archivePreset(jsonRequest({ id: "custom-local" }));
    expect(archived.status).toBe(200);
  });
});
