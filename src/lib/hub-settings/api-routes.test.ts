import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  DELETE as deleteBrandKit,
  GET as getBrandKit,
  PUT as putBrandKit,
} from "@/app/api/brand-kit/route";
import {
  GET as getPreferences,
  PUT as putPreferences,
} from "@/app/api/preferences/route";
import {
  getHubBrandKitRecord,
  hubSettingsKey,
  resetHubSettingsStoreForTests,
} from "@/lib/hub-settings/store";
import {
  getPreferredSnippetLibrary,
  resetPreferredSnippetLibrariesForTests,
} from "@/lib/snippets/preferred-library";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  bargainingUnitId?: string;
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
      bargainingUnitId: input?.bargainingUnitId,
      roles: input?.roles ?? (["local_president"] as UserRole[]),
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

const validKit = {
  version: "2.0" as const,
  local: { localNumber: "7", bargainingUnitCode: "pt" },
  profiles: [{ id: "profile-pt", bargainingUnitCode: "pt" }],
  activeProfileId: "profile-pt",
  primaryColor: "#111111",
  secondaryColor: "#222222",
  accentColor: "#333333",
  useOfficialLogo: false,
  updatedAt: "2026-09-25T00:00:00.000Z",
};

describe("GET/PUT/DELETE /api/brand-kit", () => {
  beforeEach(() => {
    authMock.mockReset();
    resetHubSettingsStoreForTests();
    resetPreferredSnippetLibrariesForTests();
  });

  afterEach(() => {
    resetHubSettingsStoreForTests();
    resetPreferredSnippetLibrariesForTests();
  });

  it("returns 401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await getBrandKit()).status).toBe(401);
    expect((await putBrandKit(jsonRequest({ brandKit: validKit }))).status).toBe(
      401,
    );
    expect((await deleteBrandKit()).status).toBe(401);
  });

  it("rejects invalid JSON, extra keys, and empty patches", async () => {
    authMock.mockResolvedValue(session());
    const invalid = await putBrandKit({
      json: async () => {
        throw new SyntaxError("bad json");
      },
    } as unknown as Request);
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: "Invalid JSON" });

    const extra = await putBrandKit(
      jsonRequest({ brandKit: validKit, unionId: "union-other" }),
    );
    expect(extra.status).toBe(400);

    const empty = await putBrandKit(jsonRequest({}));
    expect(empty.status).toBe(400);
  });

  it("stores the kit on the session key and syncs preferred CA library for that local only", async () => {
    authMock.mockResolvedValue(session({ bargainingUnitId: "bu-pt" }));
    const saved = await putBrandKit(jsonRequest({ brandKit: validKit }));
    expect(saved.status).toBe(200);
    const body = (await saved.json()) as {
      brandKit: { primaryColor: string; local: { bargainingUnitCode?: string } };
      onboardingComplete: boolean;
    };
    expect(body.brandKit.primaryColor).toBe("#111111");
    expect(body.onboardingComplete).toBe(false);
    expect(
      getPreferredSnippetLibrary("union-b7p", "local-7", "bu-pt"),
    ).toBe("caat-s-pt");
    expect(getPreferredSnippetLibrary("union-b7p", "local-7")).toBe("caat-s-pt");
    expect(getPreferredSnippetLibrary("union-other", "local-7")).toBeNull();

    authMock.mockResolvedValue(
      session({ id: "user-sister", localId: "local-1337" }),
    );
    const other = await getBrandKit();
    expect(other.status).toBe(200);
    expect(await other.json()).toEqual({
      brandKit: null,
      onboardingComplete: false,
    });
    expect(getPreferredSnippetLibrary("union-b7p", "local-1337")).toBeNull();
  });

  it("does not let a second officer read or clear another officer's kit", async () => {
    authMock.mockResolvedValue(session());
    await putBrandKit(
      jsonRequest({ brandKit: validKit, onboardingComplete: true }),
    );

    authMock.mockResolvedValue(session({ id: "user-other-officer" }));
    const peek = await getBrandKit();
    expect(await peek.json()).toEqual({
      brandKit: null,
      onboardingComplete: false,
    });

    const cleared = await deleteBrandKit();
    expect(cleared.status).toBe(200);
    expect(
      getHubBrandKitRecord(hubSettingsKey("user-president-7", "union-b7p")),
    ).toMatchObject({
      brandKit: expect.objectContaining({ primaryColor: "#111111" }),
      onboardingComplete: true,
    });
  });
});

describe("GET/PUT /api/preferences", () => {
  beforeEach(() => {
    authMock.mockReset();
    resetHubSettingsStoreForTests();
  });

  afterEach(() => {
    resetHubSettingsStoreForTests();
  });

  const prefs = {
    fontSize: "large" as const,
    highContrast: true,
    reducedMotion: false,
    stewardMobileMode: false,
  };

  it("returns 401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await getPreferences()).status).toBe(401);
    expect(
      (await putPreferences(jsonRequest({ preferences: prefs }))).status,
    ).toBe(401);
  });

  it("rejects invalid JSON and extra keys, then stores on the session key only", async () => {
    authMock.mockResolvedValue(session());
    const invalid = await putPreferences({
      json: async () => {
        throw new SyntaxError("bad json");
      },
    } as unknown as Request);
    expect(invalid.status).toBe(400);

    const extra = await putPreferences(
      jsonRequest({ preferences: prefs, userId: "attacker" }),
    );
    expect(extra.status).toBe(400);

    const saved = await putPreferences(jsonRequest({ preferences: prefs }));
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({ preferences: prefs });

    authMock.mockResolvedValue(session({ id: "user-other-officer" }));
    const other = await getPreferences();
    expect(await other.json()).toEqual({ preferences: null });
  });
});
