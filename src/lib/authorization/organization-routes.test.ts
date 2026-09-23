import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listMemberships,
  POST as createMembership,
} from "@/app/api/organization/memberships/route";
import { GET as listOfficers } from "@/app/api/organization/officers/route";
import { GET as listDelegations } from "@/app/api/organization/delegations/route";
import { GET as getEffectiveAccess } from "@/app/api/organization/effective-access/route";

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

describe("organization HTTP gates", () => {
  beforeEach(() => {
    authMock.mockReset();
    vi.stubEnv("DATABASE_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 503 for membership, officer, and delegation APIs without Postgres", async () => {
    authMock.mockResolvedValue(session());
    expect((await listMemberships(new Request("http://localhost/api/organization/memberships"))).status).toBe(
      503,
    );
    expect((await listOfficers(new Request("http://localhost/api/organization/officers"))).status).toBe(
      503,
    );
    expect(
      (await listDelegations(new Request("http://localhost/api/organization/delegations"))).status,
    ).toBe(503);
    expect(
      (
        await createMembership({
          json: async () => ({ userId: "user-member-7" }),
        } as Request)
      ).status,
    ).toBe(503);
  });

  it("returns 401 for effective access without a session and 400 without a local", async () => {
    authMock.mockResolvedValue(null);
    expect(
      (await getEffectiveAccess(new Request("http://localhost/api/organization/effective-access")))
        .status,
    ).toBe(401);

    authMock.mockResolvedValue(session({ localId: null }));
    const missingLocal = await getEffectiveAccess(
      new Request("http://localhost/api/organization/effective-access"),
    );
    expect(missingLocal.status).toBe(400);
    expect(await missingLocal.json()).toEqual({ error: "Local context required" });
  });

  it("returns 404 when a member asks for another local's effective access", async () => {
    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    const res = await getEffectiveAccess(
      new Request("http://localhost/api/organization/effective-access?localId=local-1337"),
    );
    expect(res.status).toBe(404);
  });

  it("returns the president's home-local capabilities without inventing case access for another local", async () => {
    authMock.mockResolvedValue(session());
    const home = await getEffectiveAccess(
      new Request("http://localhost/api/organization/effective-access"),
    );
    expect(home.status).toBe(200);
    const body = (await home.json()) as {
      localId: string;
      capabilities: Array<{ capability: string; allowed: boolean }>;
    };
    expect(body.localId).toBe("local-7");
    expect(body.capabilities.some((row) => row.capability === "memberships.manage")).toBe(
      true,
    );
    expect(body.capabilities.some((row) => row.capability === "grievances.case.write")).toBe(
      true,
    );

    const sister = await getEffectiveAccess(
      new Request("http://localhost/api/organization/effective-access?localId=local-1337"),
    );
    expect(sister.status).toBe(404);
  });
});
