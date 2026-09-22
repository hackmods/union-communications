import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AttachmentScanStatus } from "@/types/attachments";
import type { UserRole } from "@/types/tenant";
import type { TimeEntry } from "@/types/time";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as listEntryAttachments } from "@/app/api/time/entries/[id]/attachments/route";
import { GET as downloadEntryAttachment } from "@/app/api/time/entries/[id]/attachments/[attachmentId]/download/route";
import {
  GET as listOtPolicies,
  POST as upsertOtPolicy,
} from "@/app/api/time/ot-policies/route";
import {
  GET as listGroups,
  POST as upsertGroup,
} from "@/app/api/time/groups/route";
import {
  GET as listShiftSeries,
  POST as createShiftSeries,
} from "@/app/api/time/shift-series/route";
import { POST as expandShiftSeries } from "@/app/api/time/shift-series/[id]/expand/route";
import { POST as payrollExport } from "@/app/api/time/payroll-export/route";
import {
  insertAttachmentForTests,
  resetAttachmentMemoryForTests,
} from "@/lib/attachments/memory-adapter";
import { resetAttachmentStore } from "@/lib/attachments/store";
import {
  getObjectStorage,
  resetObjectStorageCache,
} from "@/lib/attachments/storage";
import { memoryTimeStore } from "@/lib/time/memory-adapter";
import { resetTimeStore } from "@/lib/time/store";
import { resetTenantOverlayForTests } from "@/lib/tenant/overlay";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  name?: string;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-steward-7",
      name: input?.name ?? "Local 7 Steward",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-b7p"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-7"),
      roles: input?.roles ?? (["local_steward"] as UserRole[]),
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

function params(id: string): { params: Promise<{ id: string }> };
function params(
  id: string,
  attachmentId: string,
): { params: Promise<{ id: string; attachmentId: string }> };
function params(id: string, attachmentId?: string) {
  return {
    params: Promise.resolve(
      attachmentId ? { id, attachmentId } : { id },
    ),
  };
}

let seedSeq = 0;

async function seedEntry(input: {
  workerId: string;
  unionId?: string;
  localId?: string;
  clockInAt?: string;
  clockOutAt?: string;
  status?: "submitted" | "approved";
}): Promise<TimeEntry> {
  seedSeq += 1;
  const day = String(seedSeq).padStart(2, "0");
  const entry = await memoryTimeStore.createManualEntry(
    {
      category: "release",
      jobCodeId: "code-release-grievance",
      clockInAt: input.clockInAt ?? `2031-05-${day}T10:00:00.000Z`,
      clockOutAt: input.clockOutAt ?? `2031-05-${day}T12:00:00.000Z`,
      workerId: input.workerId,
      workerName: input.workerId,
      status: "submitted",
      entrySource: "manual_range",
    },
    {
      unionId: input.unionId ?? "union-b7p",
      localId: input.localId ?? "local-7",
      jobCodeLabel: "Grievance handling",
    },
  );
  if (input.status === "approved") {
    const approved = await memoryTimeStore.updateEntryStatus(
      entry.id,
      "approved",
      { approvedById: "user-president-7" },
    );
    if (!approved) {
      throw new Error(`Failed to approve seeded entry ${entry.id}`);
    }
    return approved;
  }
  return entry;
}

describe("time punch-photo HTTP", () => {
  let dir: string;
  const previousLocalDir = process.env.ATTACHMENT_LOCAL_DIR;
  const photoBytes = Buffer.from("fake-jpeg-bytes");

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "uo-time-att-"));
    process.env.ATTACHMENT_LOCAL_DIR = dir;
    resetTimeStore();
    resetAttachmentMemoryForTests();
    resetAttachmentStore();
    resetObjectStorageCache();
    resetTenantOverlayForTests();
    authMock.mockReset();
  });

  afterEach(async () => {
    resetTimeStore();
    resetAttachmentMemoryForTests();
    resetAttachmentStore();
    resetObjectStorageCache();
    resetTenantOverlayForTests();
    if (previousLocalDir === undefined) {
      delete process.env.ATTACHMENT_LOCAL_DIR;
    } else {
      process.env.ATTACHMENT_LOCAL_DIR = previousLocalDir;
    }
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  function seedPhoto(input: {
    id: string;
    timeEntryId: string;
    unionId?: string;
    localId?: string;
    scanStatus?: AttachmentScanStatus;
    fileName?: string;
  }) {
    const unionId = input.unionId ?? "union-b7p";
    const localId = input.localId ?? "local-7";
    const fileName = input.fileName ?? 'punch "in".jpg';
    return insertAttachmentForTests({
      id: input.id,
      unionId,
      localId,
      timeEntryId: input.timeEntryId,
      punchKind: "clock_in",
      fileName,
      mimeType: "image/jpeg",
      sizeBytes: photoBytes.length,
      storageKey: `${unionId}/${localId}/time/${input.timeEntryId}/${input.id}/${fileName.replace(/"/g, "")}`,
      scanStatus: input.scanStatus ?? "skipped_dev",
      uploadedById: "user-steward-7",
      createdAt: "2026-09-01T00:00:00.000Z",
    });
  }

  it("returns 401 without a session and 403 for members", async () => {
    const entry = await seedEntry({ workerId: "user-steward-7" });
    authMock.mockResolvedValue(null);
    expect(
      (
        await listEntryAttachments(
          new Request("http://localhost"),
          params(entry.id),
        )
      ).status,
    ).toBe(401);

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    const forbidden = await listEntryAttachments(
      new Request("http://localhost"),
      params(entry.id),
    );
    expect(forbidden.status).toBe(403);
  });

  it("lets a steward list only their own entry and 404s a coworker", async () => {
    const own = await seedEntry({ workerId: "user-steward-7" });
    const coworker = await seedEntry({
      workerId: "user-other-worker",
      clockInAt: "2031-05-02T10:00:00.000Z",
      clockOutAt: "2031-05-02T12:00:00.000Z",
    });
    seedPhoto({ id: "att-own", timeEntryId: own.id });
    seedPhoto({ id: "att-coworker", timeEntryId: coworker.id });

    authMock.mockResolvedValue(session());
    const listed = await listEntryAttachments(
      new Request("http://localhost"),
      params(own.id),
    );
    expect(listed.status).toBe(200);
    const body = (await listed.json()) as {
      attachments: Array<{ id: string }>;
    };
    expect(body.attachments.map((row) => row.id)).toEqual(["att-own"]);

    const hidden = await listEntryAttachments(
      new Request("http://localhost"),
      params(coworker.id),
    );
    expect(hidden.status).toBe(404);
  });

  it("returns 404 for another union, including platform_admin", async () => {
    const foreign = await seedEntry({
      workerId: "user-other",
      unionId: "union-other",
      localId: "local-1",
    });
    seedPhoto({
      id: "att-foreign",
      timeEntryId: foreign.id,
      unionId: "union-other",
      localId: "local-1",
    });
    authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
    const listed = await listEntryAttachments(
      new Request("http://localhost"),
      params(foreign.id),
    );
    expect(listed.status).toBe(404);

    const downloaded = await downloadEntryAttachment(
      new Request("http://localhost"),
      params(foreign.id, "att-foreign"),
    );
    expect(downloaded.status).toBe(404);
  });

  it("404s a mismatched attachment, 403s an unclean scan, and returns private bytes", async () => {
    const entry = await seedEntry({ workerId: "user-steward-7" });
    const other = await seedEntry({
      workerId: "user-steward-7",
      clockInAt: "2031-05-03T10:00:00.000Z",
      clockOutAt: "2031-05-03T12:00:00.000Z",
    });
    const clean = seedPhoto({
      id: "att-clean",
      timeEntryId: entry.id,
      scanStatus: "skipped_dev",
    });
    const pending = seedPhoto({
      id: "att-pending",
      timeEntryId: entry.id,
      scanStatus: "pending",
    });
    seedPhoto({ id: "att-other-entry", timeEntryId: other.id });
    await getObjectStorage().put(clean.storageKey, photoBytes, clean.mimeType);

    authMock.mockResolvedValue(session());
    const mismatch = await downloadEntryAttachment(
      new Request("http://localhost"),
      params(entry.id, "att-other-entry"),
    );
    expect(mismatch.status).toBe(404);

    const blocked = await downloadEntryAttachment(
      new Request("http://localhost"),
      params(entry.id, pending.id),
    );
    expect(blocked.status).toBe(403);
    expect(await blocked.json()).toEqual({
      error: "Attachment is not available for download",
    });

    const ok = await downloadEntryAttachment(
      new Request("http://localhost"),
      params(entry.id, clean.id),
    );
    expect(ok.status).toBe(200);
    expect(ok.headers.get("Content-Type")).toBe("image/jpeg");
    expect(ok.headers.get("Cache-Control")).toBe("private, no-store");
    expect(ok.headers.get("Content-Disposition")).toBe(
      'inline; filename="punch in.jpg"',
    );
    expect(Buffer.from(await ok.arrayBuffer())).toEqual(photoBytes);
  });
});

describe("time OT, groups, shift-series, and payroll-export HTTP", () => {
  beforeEach(() => {
    resetTimeStore();
    resetTenantOverlayForTests();
    authMock.mockReset();
  });

  afterEach(() => {
    resetTimeStore();
    resetTenantOverlayForTests();
  });

  it("returns 401 without a session and 403 for members and stewards", async () => {
    authMock.mockResolvedValue(null);
    expect((await listOtPolicies()).status).toBe(401);
    expect((await listGroups()).status).toBe(401);
    expect((await listShiftSeries()).status).toBe(401);

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    expect((await listOtPolicies()).status).toBe(403);
    expect(
      (await payrollExport(jsonRequest({ profileId: "x", from: "a", to: "b" })))
        .status,
    ).toBe(403);

    authMock.mockResolvedValue(session());
    expect((await listOtPolicies()).status).toBe(403);
    expect((await listGroups()).status).toBe(403);
    expect((await listShiftSeries()).status).toBe(403);
    expect(
      (await upsertOtPolicy(jsonRequest({ name: "Local OT" }))).status,
    ).toBe(403);
  });

  it("lists only the session local and stamps tenant ids on create", async () => {
    await memoryTimeStore.upsertOtPolicy(
      { name: "Home OT" },
      { unionId: "union-b7p", localId: "local-7" },
    );
    await memoryTimeStore.upsertOtPolicy(
      { name: "Sister OT" },
      { unionId: "union-b7p", localId: "local-1337" },
    );
    await memoryTimeStore.upsertOtPolicy(
      { name: "Foreign OT" },
      { unionId: "union-other", localId: "local-1" },
    );
    await memoryTimeStore.upsertWorkerGroup(
      { name: "Home board" },
      { unionId: "union-b7p", localId: "local-7" },
    );
    await memoryTimeStore.upsertWorkerGroup(
      { name: "Sister board" },
      { unionId: "union-b7p", localId: "local-1337" },
    );
    await memoryTimeStore.createShiftSeries(
      {
        label: "Home desk",
        startTime: "09:00",
        durationMinutes: 480,
        category: "staff",
        assignedWorkerIds: ["user-president-7"],
        recurrence: {
          frequency: "weekly",
          weekdays: [1],
          startsOn: "2030-09-01",
        },
      },
      {
        unionId: "union-b7p",
        localId: "local-7",
        createdById: "user-president-7",
      },
    );
    await memoryTimeStore.createShiftSeries(
      {
        label: "Sister desk",
        startTime: "09:00",
        durationMinutes: 480,
        category: "staff",
        assignedWorkerIds: ["user-560"],
        recurrence: {
          frequency: "weekly",
          weekdays: [1],
          startsOn: "2030-09-01",
        },
      },
      {
        unionId: "union-b7p",
        localId: "local-1337",
        createdById: "user-560",
      },
    );

    authMock.mockResolvedValue(
      session({ id: "user-president-7", roles: ["local_president"] }),
    );
    const policies = await listOtPolicies();
    expect(policies.status).toBe(200);
    const policyBody = (await policies.json()) as {
      policies: Array<{ name: string; unionId: string; localId: string }>;
    };
    expect(policyBody.policies.map((row) => row.name)).toEqual(["Home OT"]);
    expect(policyBody.policies[0]).toMatchObject({
      unionId: "union-b7p",
      localId: "local-7",
    });

    const groups = await listGroups();
    const groupBody = (await groups.json()) as {
      groups: Array<{ name: string; localId: string }>;
    };
    expect(groupBody.groups.map((row) => row.name)).toEqual(["Home board"]);

    const series = await listShiftSeries();
    const seriesBody = (await series.json()) as {
      series: Array<{ label: string; localId: string }>;
    };
    expect(seriesBody.series.map((row) => row.label)).toEqual(["Home desk"]);

    const createdPolicy = await upsertOtPolicy(
      jsonRequest({
        name: "Session OT",
        unionId: "union-other",
        localId: "local-evil",
      }),
    );
    expect(createdPolicy.status).toBe(201);
    const created = (await createdPolicy.json()) as {
      policy: { unionId: string; localId: string; name: string };
    };
    expect(created.policy).toMatchObject({
      name: "Session OT",
      unionId: "union-b7p",
      localId: "local-7",
    });

    const createdGroup = await upsertGroup(
      jsonRequest({ name: "Session board", unionId: "union-other" }),
    );
    expect(createdGroup.status).toBe(201);
    const group = (await createdGroup.json()) as {
      group: { unionId: string; localId: string };
    };
    expect(group.group.unionId).toBe("union-b7p");
    expect(group.group.localId).toBe("local-7");

    const createdSeries = await createShiftSeries(
      jsonRequest({
        label: "Session desk",
        startTime: "09:00",
        durationMinutes: 480,
        category: "staff",
        assignedWorkerIds: ["user-president-7"],
        recurrence: {
          frequency: "weekly",
          weekdays: [1],
          startsOn: "2030-10-01",
        },
        unionId: "union-other",
      }),
    );
    expect(createdSeries.status).toBe(201);
    const seriesRow = (await createdSeries.json()) as {
      series: { unionId: string; localId: string; createdById: string };
    };
    expect(seriesRow.series.unionId).toBe("union-b7p");
    expect(seriesRow.series.localId).toBe("local-7");
    expect(seriesRow.series.createdById).toBe("user-president-7");
  });

  it("does not expand another union's series and 400s missing range", async () => {
    const foreign = await memoryTimeStore.createShiftSeries(
      {
        label: "Foreign desk",
        startTime: "09:00",
        durationMinutes: 480,
        category: "staff",
        assignedWorkerIds: ["user-other"],
        recurrence: {
          frequency: "weekly",
          weekdays: [1],
          startsOn: "2030-09-01",
        },
        status: "published",
      },
      {
        unionId: "union-other",
        localId: "local-1",
        createdById: "user-other",
      },
    );
    authMock.mockResolvedValue(
      session({ id: "user-president-7", roles: ["local_president"] }),
    );
    const missing = await expandShiftSeries(
      jsonRequest({}),
      params(foreign.id),
    );
    expect(missing.status).toBe(400);

    const expanded = await expandShiftSeries(
      jsonRequest({
        from: "2030-09-01T00:00:00.000Z",
        to: "2030-09-30T23:59:59.000Z",
      }),
      params(foreign.id),
    );
    expect(expanded.status).toBe(200);
    const body = (await expanded.json()) as {
      shifts: unknown[];
      created: number;
    };
    expect(body.created).toBe(0);
    expect(body.shifts).toEqual([]);
  });

  it("404s another local's payroll profile and exports only the session local", async () => {
    const home = await memoryTimeStore.upsertPayrollProfile(
      { name: "Home payroll", vendor: "generic_csv" },
      { unionId: "union-b7p", localId: "local-7" },
    );
    const sister = await memoryTimeStore.upsertPayrollProfile(
      { name: "Sister payroll", vendor: "generic_csv" },
      { unionId: "union-b7p", localId: "local-1337" },
    );
    await seedEntry({
      workerId: "user-payroll-home",
      status: "approved",
      clockInAt: "2031-11-21T10:00:00.000Z",
      clockOutAt: "2031-11-21T12:00:00.000Z",
    });
    await seedEntry({
      workerId: "user-payroll-sister",
      localId: "local-1337",
      status: "approved",
      clockInAt: "2031-11-21T10:00:00.000Z",
      clockOutAt: "2031-11-21T12:00:00.000Z",
    });

    authMock.mockResolvedValue(
      session({ id: "user-president-7", roles: ["local_president"] }),
    );
    expect((await payrollExport(jsonRequest({}))).status).toBe(400);

    const hidden = await payrollExport(
      jsonRequest({
        profileId: sister.id,
        from: "2031-11-21T00:00:00.000Z",
        to: "2031-11-22T00:00:00.000Z",
      }),
    );
    expect(hidden.status).toBe(404);

    const exported = await payrollExport(
      jsonRequest({
        profileId: home.id,
        from: "2031-11-21T00:00:00.000Z",
        to: "2031-11-22T00:00:00.000Z",
      }),
    );
    expect(exported.status).toBe(200);
    expect(exported.headers.get("Content-Type")).toContain("text/csv");
    const csv = await exported.text();
    expect(csv).toContain("user-payroll-home");
    expect(csv).not.toContain("user-payroll-sister");
  });
});
