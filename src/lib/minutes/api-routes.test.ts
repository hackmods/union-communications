import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { POST as approveMinutes } from "@/app/api/minutes/[id]/approve/route";
import { memoryMinutesStore, resetMinutesMemoryForTests } from "./memory-adapter";
import { resetMinutesStore } from "./store";

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

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("minutes approve API", () => {
  beforeEach(() => {
    resetMinutesMemoryForTests();
    resetMinutesStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetMinutesMemoryForTests();
    resetMinutesStore();
  });

  it("returns 401 without a session and 403 for members", async () => {
    authMock.mockResolvedValue(null);
    expect((await approveMinutes(new Request("http://localhost"), params("minutes-001"))).status).toBe(
      401,
    );

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    const forbidden = await approveMinutes(
      new Request("http://localhost"),
      params("minutes-001"),
    );
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "Forbidden" });
  });

  it("returns 404 for a missing id and for another union, including platform_admin", async () => {
    const foreign = await memoryMinutesStore.create(
      {
        meetingDate: "2026-08-01T12:00:00.000Z",
        meetingType: "exec",
        attendees: ["Chair"],
        motions: [],
        notes: "Other union",
      },
      {
        unionId: "union-other",
        localId: "local-1",
        recordedById: "user-other",
        recordedByName: "Other",
      },
    );

    authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
    const missing = await approveMinutes(
      new Request("http://localhost"),
      params("minutes-does-not-exist"),
    );
    expect(missing.status).toBe(404);

    const crossUnion = await approveMinutes(
      new Request("http://localhost"),
      params(foreign.id),
    );
    expect(crossUnion.status).toBe(404);
    expect(await crossUnion.json()).toEqual({ error: "Not found" });
    expect((await memoryMinutesStore.getById(foreign.id))?.status).toBe("draft");
  });

  it("returns 404 when a steward from another local tries to approve", async () => {
    authMock.mockResolvedValue(
      session({
        id: "user-steward-560",
        localId: "local-560",
        roles: ["local_steward"],
      }),
    );
    const res = await approveMinutes(
      new Request("http://localhost"),
      params("minutes-001"),
    );
    expect(res.status).toBe(404);
    expect((await memoryMinutesStore.getById("minutes-001"))?.status).toBe(
      "draft",
    );
  });

  it("approves a draft once, then 409s on retry", async () => {
    authMock.mockResolvedValue(session());
    const first = await approveMinutes(
      new Request("http://localhost"),
      params("minutes-001"),
    );
    expect(first.status).toBe(200);
    const body = (await first.json()) as {
      minutes: { id: string; status: string; approvedAt?: string };
    };
    expect(body.minutes.id).toBe("minutes-001");
    expect(body.minutes.status).toBe("approved");
    expect(body.minutes.approvedAt).toBeTruthy();

    const retry = await approveMinutes(
      new Request("http://localhost"),
      params("minutes-001"),
    );
    expect(retry.status).toBe(409);
    expect(await retry.json()).toEqual({ error: "Already approved" });
  });
});
