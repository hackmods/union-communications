import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as listCalendar } from "@/app/api/calendar/route";
import { resetGrievanceMemoryForTests } from "@/lib/grievance/memory-adapter";
import { grievanceStore, resetGrievanceStore } from "@/lib/grievance/store";
import { resetBumpingStore } from "@/lib/bumping/store";
import {
  createOverlayUnion,
  resetTenantOverlayForTests,
} from "@/lib/tenant/overlay";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  bargainingUnitId?: string;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-steward-243",
      name: "Local 243 Steward",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-opseu"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-243"),
      bargainingUnitId: input?.bargainingUnitId,
      roles: input?.roles ?? (["local_steward"] as UserRole[]),
    },
  };
}

type CalendarEvent = {
  id: string;
  kind: string;
  title: string;
  unionId: string;
  localId: string;
  parentId: string;
};

async function listEvents() {
  const res = await listCalendar();
  const body = (await res.json()) as { events?: CalendarEvent[]; error?: string };
  return { status: res.status, body };
}

describe("GET /api/calendar", () => {
  beforeEach(() => {
    resetGrievanceMemoryForTests();
    resetGrievanceStore();
    resetBumpingStore();
    resetTenantOverlayForTests();
    authMock.mockReset();
  });

  afterEach(() => {
    resetGrievanceMemoryForTests();
    resetGrievanceStore();
    resetTenantOverlayForTests();
  });

  it("returns 401 without a session and 403 for members", async () => {
    authMock.mockResolvedValue(null);
    expect((await listCalendar()).status).toBe(401);

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    const forbidden = await listCalendar();
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "Forbidden" });
  });

  it("lets a steward list only assigned grievance meetings plus local bumping sessions", async () => {
    authMock.mockResolvedValue(session());
    const { status, body } = await listEvents();
    expect(status).toBe(200);
    const events = body.events ?? [];
    expect(events.every((e) => e.unionId === "union-opseu")).toBe(true);
    expect(events.every((e) => e.localId === "local-243")).toBe(true);
    expect(events.map((e) => e.id)).toContain("meet-001");
    expect(events.map((e) => e.id)).not.toContain("meet-002");
    expect(events.map((e) => e.id)).toContain("sess-001");
  });

  it("does not leak another union's grievance meetings, including to platform_admin", async () => {
    const tenant = createOverlayUnion({
      name: "Other Workers",
      localNumber: "999",
    });
    const localId = tenant.locals![0]!.id;
    const created = await grievanceStore.create(
      {
        category: "Discipline",
        filedAt: "2026-09-01T12:00:00.000Z",
      },
      {
        unionId: tenant.union.id,
        localId,
        createdById: "user-other-pres",
        assignedStewardId: "user-other-steward",
      },
    );
    const meeting = await grievanceStore.addMeeting(
      created.grievance.id,
      {
        title: "Secret other-union meeting",
        startsAt: "2026-09-10T14:00:00.000Z",
        endsAt: "2026-09-10T15:00:00.000Z",
      },
      {
        unionId: tenant.union.id,
        localId,
        createdById: "user-other-pres",
      },
    );
    expect(meeting).not.toBeNull();

    authMock.mockResolvedValue(
      session({
        id: "user-platform",
        roles: ["platform_admin"],
      }),
    );
    const { status, body } = await listEvents();
    expect(status).toBe(200);
    const events = body.events ?? [];
    expect(events.map((e) => e.id)).not.toContain(meeting!.id);
    expect(events.every((e) => e.unionId === "union-opseu")).toBe(true);
  });

  it("keeps a local president on their local; union_admin without localId sees sister locals", async () => {
    await grievanceStore.addMeeting(
      "grev-003",
      {
        title: "Local 560 step meeting",
        startsAt: "2026-09-12T14:00:00.000Z",
        endsAt: "2026-09-12T15:00:00.000Z",
      },
      {
        unionId: "union-opseu",
        localId: "local-560",
        createdById: "user-division-admin",
      },
    );

    authMock.mockResolvedValue(
      session({
        id: "user-president-243",
        roles: ["local_president"],
      }),
    );
    const president = await listEvents();
    expect(president.status).toBe(200);
    expect(president.body.events?.every((e) => e.localId === "local-243")).toBe(
      true,
    );
    expect(
      president.body.events?.some((e) => e.title === "Local 560 step meeting"),
    ).toBe(false);

    authMock.mockResolvedValue(
      session({
        id: "user-union-admin",
        localId: null,
        roles: ["union_admin"],
      }),
    );
    const admin = await listEvents();
    expect(admin.status).toBe(200);
    expect(
      admin.body.events?.some((e) => e.title === "Local 560 step meeting"),
    ).toBe(true);
    expect(admin.body.events?.every((e) => e.unionId === "union-opseu")).toBe(
      true,
    );
  });

  it("returns bumping sessions only for stability_member (no grievance meetings)", async () => {
    authMock.mockResolvedValue(
      session({
        id: "user-stability",
        roles: ["stability_member"],
      }),
    );
    const { status, body } = await listEvents();
    expect(status).toBe(200);
    const events = body.events ?? [];
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.kind === "bumping_session")).toBe(true);
    expect(events.map((e) => e.id)).toContain("sess-001");
    expect(events.map((e) => e.id)).not.toContain("meet-001");
  });

  it("returns 403 when bumping is off and the actor cannot access grievances", async () => {
    const tenant = createOverlayUnion({
      name: "No Casework Union",
      enabledModules: ["comms"],
      localNumber: "777",
    });
    authMock.mockResolvedValue(
      session({
        id: "user-stability-777",
        unionId: tenant.union.id,
        localId: tenant.locals![0]!.id,
        roles: ["stability_member"],
      }),
    );
    const res = await listCalendar();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });
});
