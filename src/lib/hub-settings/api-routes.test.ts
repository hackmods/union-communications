import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock, rlsContextMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  rlsContextMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/auth/rls-scope", () => ({
  rlsContextForSession: rlsContextMock,
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
  getLocalBrandKit,
  getPersonalBrandRecord,
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

describe("GET/PUT/DELETE /api/brand-kit (hybrid)", () => {
  beforeEach(() => {
    authMock.mockReset();
    rlsContextMock.mockReset();
    rlsContextMock.mockResolvedValue({
      unionId: "union-b7p",
      localId: "local-7",
      userId: "user-president-7",
    });
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

  it("stores personal overlay and syncs preferred CA library for that local only", async () => {
    authMock.mockResolvedValue(session({ bargainingUnitId: "bu-pt" }));
    const saved = await putBrandKit(jsonRequest({ brandKit: validKit }));
    expect(saved.status).toBe(200);
    const body = (await saved.json()) as {
      brandKit: { primaryColor: string; local: { bargainingUnitCode?: string } };
      onboardingComplete: boolean;
      source?: {
        hasPersonalOverlay: boolean;
        canPublishLocal: boolean;
        hasLocalShared: boolean;
      };
    };
    expect(body.brandKit.primaryColor).toBe("#111111");
    expect(body.onboardingComplete).toBe(false);
    expect(body.source?.hasPersonalOverlay).toBe(true);
    expect(body.source?.canPublishLocal).toBe(true);
    expect(body.source?.hasLocalShared).toBe(false);
    expect(
      getPreferredSnippetLibrary("union-b7p", "local-7", "bu-pt"),
    ).toBe("caat-s-pt");
    expect(getPreferredSnippetLibrary("union-b7p", "local-7")).toBe("caat-s-pt");
    expect(getPreferredSnippetLibrary("union-other", "local-7")).toBeNull();

    authMock.mockResolvedValue(
      session({ id: "user-sister", localId: "local-1337" }),
    );
    rlsContextMock.mockResolvedValue({
      unionId: "union-b7p",
      localId: "local-1337",
      userId: "user-sister",
    });
    const other = await getBrandKit();
    expect(other.status).toBe(200);
    const otherBody = (await other.json()) as {
      brandKit: { primaryColor?: string } | null;
      source?: { hasLocalShared: boolean };
    };
    // Sister local gets an ephemeral seed — not a published Local row.
    expect(otherBody.source?.hasLocalShared).toBe(false);
    expect(otherBody.brandKit?.primaryColor).not.toBe("#111111");
    expect(getPreferredSnippetLibrary("union-b7p", "local-1337")).toBeNull();
  });

  it("keeps personal overlay private until Local publish", async () => {
    authMock.mockResolvedValue(session());
    await putBrandKit(
      jsonRequest({
        brandKit: { ...validKit, signatureName: "President Only" },
        onboardingComplete: true,
      }),
    );

    authMock.mockResolvedValue(session({ id: "user-other-officer" }));
    rlsContextMock.mockResolvedValue({
      unionId: "union-b7p",
      localId: "local-7",
      userId: "user-other-officer",
    });
    const peek = await getBrandKit();
    const peekBody = (await peek.json()) as {
      brandKit: { signatureName?: string; primaryColor?: string } | null;
    };
    expect(peekBody.brandKit?.signatureName).toBeUndefined();

    const cleared = await deleteBrandKit();
    expect(cleared.status).toBe(200);
    expect(
      (await getPersonalBrandRecord("user-president-7", "union-b7p")).overlay,
    ).toMatchObject({
      signatureName: "President Only",
    });
  });

  it("publishes Local shared defaults for presidents and rejects stewards", async () => {
    authMock.mockResolvedValue(session());
    const published = await putBrandKit(
      jsonRequest({ brandKit: validKit, scope: "local" }),
    );
    expect(published.status).toBe(200);
    expect(
      (await getLocalBrandKit("union-b7p", "local-7"))?.primaryColor,
    ).toBe("#111111");

    authMock.mockResolvedValue(
      session({ id: "steward-1", roles: ["local_steward"] }),
    );
    const denied = await putBrandKit(
      jsonRequest({
        brandKit: { ...validKit, primaryColor: "#000000" },
        scope: "local",
      }),
    );
    expect(denied.status).toBe(403);
  });

  it("DELETE clears personal overlay only", async () => {
    authMock.mockResolvedValue(session());
    await putBrandKit(jsonRequest({ brandKit: validKit, scope: "local" }));
    await putBrandKit(
      jsonRequest({
        brandKit: { ...validKit, signatureName: "Temp" },
        scope: "personal",
      }),
    );
    const cleared = await deleteBrandKit();
    expect(cleared.status).toBe(200);
    const body = (await cleared.json()) as {
      brandKit: { signatureName?: string; primaryColor?: string } | null;
      source?: { hasLocalShared: boolean };
    };
    expect(body.brandKit?.signatureName).toBeUndefined();
    expect(body.brandKit?.primaryColor).toBe("#111111");
    expect(body.source?.hasLocalShared).toBe(true);
    expect(
      (await getLocalBrandKit("union-b7p", "local-7"))?.primaryColor,
    ).toBe("#111111");
  });

  it("wraps resolve in RLS context from the session", async () => {
    authMock.mockResolvedValue(session());
    await getBrandKit();
    expect(rlsContextMock).toHaveBeenCalled();
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
    expect((await putPreferences(jsonRequest({ preferences: prefs }))).status).toBe(
      401,
    );
  });

  it("stores preferences per user", async () => {
    authMock.mockResolvedValue(session());
    const saved = await putPreferences(jsonRequest({ preferences: prefs }));
    expect(saved.status).toBe(200);
    const got = await getPreferences();
    expect(await got.json()).toEqual({ preferences: prefs });
  });
});
