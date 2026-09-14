import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as listAudit } from "@/app/api/audit/route";
import { resetMemoryAuditLogForTests } from "@/lib/audit/memory-adapter";
import { auditLog, resetAuditLog } from "@/lib/audit/store";

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

function listRequest(query = ""): Request {
  return new Request(`http://localhost/api/audit${query}`);
}

type AuditRow = {
  id: string;
  action: string;
  unionId?: string;
  localId?: string;
  resourceId: string;
};

async function seed(entry: {
  action: string;
  unionId?: string;
  localId?: string;
  resourceId?: string;
}) {
  return auditLog.log({
    userId: "user-seed",
    action: entry.action,
    resourceType: "grievance",
    resourceId: entry.resourceId ?? "grev-seed",
    unionId: entry.unionId,
    localId: entry.localId,
  });
}

describe("GET /api/audit", () => {
  beforeEach(() => {
    resetMemoryAuditLogForTests();
    resetAuditLog();
    authMock.mockReset();
  });

  afterEach(() => {
    resetMemoryAuditLogForTests();
    resetAuditLog();
  });

  it("returns 401 without a session and 403 for members and stewards", async () => {
    authMock.mockResolvedValue(null);
    expect((await listAudit(listRequest())).status).toBe(401);

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    const member = await listAudit(listRequest());
    expect(member.status).toBe(403);
    expect(await member.json()).toEqual({ error: "Forbidden" });

    authMock.mockResolvedValue(
      session({ id: "user-steward-243", roles: ["local_steward"] }),
    );
    const steward = await listAudit(listRequest());
    expect(steward.status).toBe(403);
    expect(await steward.json()).toEqual({ error: "Forbidden" });
  });

  it("never returns another union's entries, even when the client forges query tenant keys", async () => {
    await seed({
      action: "grievance.view",
      unionId: "union-opseu",
      localId: "local-243",
      resourceId: "own",
    });
    await seed({
      action: "grievance.view",
      unionId: "union-other",
      localId: "local-243",
      resourceId: "foreign",
    });
    await seed({
      action: "grievance.view",
      unionId: "union-opseu",
      localId: "local-560",
      resourceId: "sister",
    });

    authMock.mockResolvedValue(session());
    const res = await listAudit(
      listRequest("?unionId=union-other&localId=local-560&limit=200"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entries: AuditRow[] };
    expect(body.entries.map((e) => e.resourceId)).toEqual(["own"]);
    expect(body.entries.every((e) => e.unionId === "union-opseu")).toBe(true);
    expect(body.entries.every((e) => e.localId === "local-243")).toBe(true);
  });

  it("caps limit at 200 and treats a missing/invalid limit as 50", async () => {
    for (let i = 0; i < 3; i += 1) {
      await seed({
        action: `seed.${i}`,
        unionId: "union-opseu",
        localId: "local-243",
        resourceId: `row-${i}`,
      });
    }

    authMock.mockResolvedValue(session());
    const capped = await listAudit(listRequest("?limit=1"));
    const cappedBody = (await capped.json()) as { entries: AuditRow[] };
    expect(capped.status).toBe(200);
    expect(cappedBody.entries).toHaveLength(1);

    const invalid = await listAudit(listRequest("?limit=nope"));
    const invalidBody = (await invalid.json()) as { entries: AuditRow[] };
    expect(invalid.status).toBe(200);
    expect(invalidBody.entries).toHaveLength(3);
  });

  it("lets union_admin without a localId read every local in the union still excluding other unions", async () => {
    await seed({
      action: "handoff.start",
      unionId: "union-opseu",
      localId: "local-560",
      resourceId: "sister",
    });
    await seed({
      action: "handoff.start",
      unionId: "union-other",
      localId: "local-1",
      resourceId: "foreign",
    });

    authMock.mockResolvedValue(
      session({
        id: "user-union-admin",
        localId: null,
        roles: ["union_admin"],
      }),
    );
    const res = await listAudit(listRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entries: AuditRow[] };
    expect(body.entries.map((e) => e.resourceId)).toContain("sister");
    expect(body.entries.map((e) => e.resourceId)).not.toContain("foreign");
  });
});
