import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { POST as promote } from "@/app/api/elections/[id]/promote/route";
import {
  memoryElectionsStore,
  resetElectionsMemoryForTests,
} from "./memory-adapter";
import { resetElectionsStore } from "./store";
import {
  memoryOfficerRosterStore,
  resetOfficerRosterMemoryForTests,
} from "@/lib/officers/memory-adapter";
import { resetOfficerRosterStore } from "@/lib/officers/store";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-president-243",
      name: "Local 243 President",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-opseu"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-243"),
      roles: input?.roles ?? (["local_president"] as UserRole[]),
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const promoteBody = {
  position: "President",
  nomineeName: "Alex Rivera",
};

describe("elections promote API", () => {
  beforeEach(() => {
    resetElectionsMemoryForTests();
    resetElectionsStore();
    resetOfficerRosterMemoryForTests();
    resetOfficerRosterStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetElectionsMemoryForTests();
    resetElectionsStore();
    resetOfficerRosterMemoryForTests();
    resetOfficerRosterStore();
  });

  it("returns 401 without a session and 403 for members, stewards, and local_exec", async () => {
    authMock.mockResolvedValue(null);
    expect(
      (await promote(jsonRequest(promoteBody), params("elec-001"))).status,
    ).toBe(401);

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    expect(
      (await promote(jsonRequest(promoteBody), params("elec-001"))).status,
    ).toBe(403);

    authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
    expect(
      (await promote(jsonRequest(promoteBody), params("elec-001"))).status,
    ).toBe(403);

    authMock.mockResolvedValue(session({ roles: ["local_exec"] }));
    const exec = await promote(jsonRequest(promoteBody), params("elec-001"));
    expect(exec.status).toBe(403);
    expect(await exec.json()).toEqual({ error: "Forbidden" });
  });

  it("returns 404 for a missing cycle", async () => {
    authMock.mockResolvedValue(session());
    const missing = await promote(
      jsonRequest(promoteBody),
      params("elec-does-not-exist"),
    );
    expect(missing.status).toBe(404);
  });

  it("returns 403 for another union, including platform_admin, and does not write a roster row", async () => {
    const foreign = await memoryElectionsStore.create(
      { title: "Other union exec", positions: ["President"] },
      { unionId: "union-other", localId: "local-1" },
    );
    const before = await memoryOfficerRosterStore.list({
      unionId: "union-other",
      localId: "local-1",
    });

    authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
    const res = await promote(jsonRequest(promoteBody), params(foreign.id));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });

    const after = await memoryOfficerRosterStore.list({
      unionId: "union-other",
      localId: "local-1",
    });
    expect(after).toHaveLength(before.length);
  });

  it("rejects forged tenant keys, then stamps the cycle tenant onto the roster row", async () => {
    authMock.mockResolvedValue(session());
    const forged = await promote(
      jsonRequest({
        ...promoteBody,
        unionId: "union-other",
        localId: "local-evil",
      }),
      params("elec-001"),
    );
    expect(forged.status).toBe(400);

    const created = await promote(jsonRequest(promoteBody), params("elec-001"));
    expect(created.status).toBe(200);
    const body = (await created.json()) as {
      officer: {
        name: string;
        role: string;
        unionId: string;
        localId: string;
        termStart: string;
      };
      cycle: { id: string; unionId: string; localId: string };
    };
    expect(body.cycle.id).toBe("elec-001");
    expect(body.officer.name).toBe("Alex Rivera");
    expect(body.officer.role).toBe("President");
    expect(body.officer.unionId).toBe("union-opseu");
    expect(body.officer.localId).toBe("local-243");
    expect(body.officer.termStart).toBe("2026-09-01");
  });
});
