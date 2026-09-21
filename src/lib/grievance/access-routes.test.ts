import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listParticipants,
  POST as addParticipant,
} from "@/app/api/grievances/[id]/participants/route";
import { DELETE as revokeParticipant } from "@/app/api/grievances/[id]/participants/[participantId]/route";
import {
  GET as listMemberUpdates,
  POST as publishMemberUpdate,
} from "@/app/api/grievances/[id]/member-updates/route";
import { DELETE as withdrawMemberUpdate } from "@/app/api/grievances/[id]/member-updates/[updateId]/route";
import {
  GET as getShare,
  PUT as shareAttachment,
} from "@/app/api/grievances/[id]/attachments/[attachmentId]/share/route";
import {
  DELETE as revokeBreakGlass,
  POST as grantBreakGlass,
} from "@/app/api/admin/grievances/[id]/break-glass/route";
import {
  memoryGrievanceStore,
  resetGrievanceMemoryForTests,
} from "./memory-adapter";
import { resetGrievanceStore } from "./store";

function session(input?: {
  id?: string;
  name?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
  mfaVerified?: boolean;
}) {
  return {
    user: {
      id: input?.id ?? "user-president-7",
      name: input?.name ?? "Local 7 President",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-b7p"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-7"),
      roles: input?.roles ?? (["local_president"] as UserRole[]),
      mfaVerified: input?.mfaVerified ?? false,
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

function params(id: string, extra?: Record<string, string>) {
  return { params: Promise.resolve({ id, ...extra }) };
}

async function seedForeignGrievance() {
  return memoryGrievanceStore.create(
    {
      category: "Other union",
      filedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      unionId: "union-other",
      localId: "local-1",
      createdById: "user-x",
      assignedStewardId: "user-x",
    },
  );
}

describe("grievance participant / member-update / share / break-glass HTTP", () => {
  beforeEach(() => {
    resetGrievanceMemoryForTests();
    resetGrievanceStore();
    authMock.mockReset();
    vi.stubEnv("DATABASE_URL", "");
  });

  afterEach(() => {
    resetGrievanceMemoryForTests();
    resetGrievanceStore();
    vi.unstubAllEnvs();
  });

  it("returns 401 without a session and 403 for members", async () => {
    authMock.mockResolvedValue(null);
    expect(
      (await listParticipants(new Request("http://localhost"), params("grev-001"))).status,
    ).toBe(401);

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    const forbidden = await listMemberUpdates(
      new Request("http://localhost"),
      params("grev-001"),
    );
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "Forbidden" });
  });

  it("returns 404 for another union, including platform_admin", async () => {
    const foreign = await seedForeignGrievance();
    authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));

    expect(
      (await listParticipants(new Request("http://localhost"), params(foreign.grievance.id)))
        .status,
    ).toBe(404);
    expect(
      (
        await addParticipant(
          jsonRequest({
            userId: "user-member-7",
            relationship: "member",
            accessLevel: "member_safe",
          }),
          params(foreign.grievance.id),
        )
      ).status,
    ).toBe(404);
    expect(
      (await listMemberUpdates(new Request("http://localhost"), params(foreign.grievance.id)))
        .status,
    ).toBe(404);
    expect(
      (
        await getShare(
          new Request("http://localhost"),
          params(foreign.grievance.id, { attachmentId: "att-1" }),
        )
      ).status,
    ).toBe(404);
  });

  it("lets the local president read participants in memory and 503s durable writes", async () => {
    authMock.mockResolvedValue(session());
    const listed = await listParticipants(
      new Request("http://localhost"),
      params("grev-001"),
    );
    expect(listed.status).toBe(200);
    const body = (await listed.json()) as {
      canManage: boolean;
      persistenceAvailable?: boolean;
      participants: Array<{ userId: string; relationship: string }>;
    };
    expect(body.canManage).toBe(true);
    expect(body.persistenceAvailable).toBe(false);
    expect(body.participants.some((row) => row.relationship === "case_worker")).toBe(
      true,
    );

    const created = await addParticipant(
      jsonRequest({
        userId: "user-member-7",
        relationship: "member",
        accessLevel: "member_safe",
      }),
      params("grev-001"),
    );
    expect(created.status).toBe(503);

    const published = await publishMemberUpdate(
      jsonRequest({ body: "A member-safe update for the member." }),
      params("grev-001"),
    );
    expect(published.status).toBe(503);

    const shared = await shareAttachment(
      new Request("http://localhost"),
      params("grev-001", { attachmentId: "att-1" }),
    );
    expect(shared.status).toBe(503);
  });

  it("returns empty member updates in memory and 503s withdraw/share writes", async () => {
    authMock.mockResolvedValue(session());
    const listed = await listMemberUpdates(
      new Request("http://localhost"),
      params("grev-001"),
    );
    expect(listed.status).toBe(200);
    expect(await listed.json()).toEqual({ updates: [], persistenceAvailable: false });

    expect(
      (
        await withdrawMemberUpdate(
          new Request("http://localhost"),
          params("grev-001", { updateId: "u-1" }),
        )
      ).status,
    ).toBe(503);
  });

  it("returns 404 when a steward tries to manage another steward's case", async () => {
    authMock.mockResolvedValue(
      session({
        id: "user-steward-7",
        name: "Local 7 Steward",
        roles: ["local_steward"],
      }),
    );
    expect(
      (await listParticipants(new Request("http://localhost"), params("grev-002"))).status,
    ).toBe(404);
    expect(
      (
        await revokeParticipant(
          new Request("http://localhost"),
          params("grev-002", { participantId: "p-1" }),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await withdrawMemberUpdate(
          new Request("http://localhost"),
          params("grev-002", { updateId: "u-1" }),
        )
      ).status,
    ).toBe(404);
  });

  it("requires host MFA before platform break-glass, then durable storage", async () => {
    authMock.mockResolvedValue(null);
    expect(
      (await grantBreakGlass(jsonRequest({ reason: "x".repeat(20) }), params("grev-001")))
        .status,
    ).toBe(401);

    authMock.mockResolvedValue(session());
    const noMfa = await grantBreakGlass(
      jsonRequest({ reason: "Need access to the restricted file for a legal hold." }),
      params("grev-001"),
    );
    expect(noMfa.status).toBe(403);
    expect(await noMfa.json()).toEqual({
      error: "Verified MFA on this host is required for break-glass access",
    });

    vi.stubEnv("AUTH_MFA_ENABLED", "true");
    authMock.mockResolvedValue(
      session({
        roles: ["local_president"],
        mfaVerified: true,
      }),
    );
    const notAdmin = await grantBreakGlass(
      jsonRequest({ reason: "Need access to the restricted file for a legal hold." }),
      params("grev-001"),
    );
    expect(notAdmin.status).toBe(403);
    expect(await notAdmin.json()).toEqual({
      error: "Platform administrator MFA is required",
    });

    authMock.mockResolvedValue(
      session({
        roles: ["platform_admin"],
        mfaVerified: true,
      }),
    );
    const noDurable = await grantBreakGlass(
      jsonRequest({ reason: "Need access to the restricted file for a legal hold." }),
      params("grev-001"),
    );
    expect(noDurable.status).toBe(503);

    const shortReason = await grantBreakGlass(jsonRequest({ reason: "too short" }), params("grev-001"));
    expect(shortReason.status).toBe(503);

    expect(
      (await revokeBreakGlass(new Request("http://localhost"), params("grev-001"))).status,
    ).toBe(503);
  });
});
