import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  jobCodes,
  timeEntries,
  timeExpectedWindows,
  timeWorkers,
  workSites,
} from "@/lib/db/schema";
import type { TimeAdapter } from "./adapter";
import { checkGeofence } from "./geofence";
import { computeNeededEntries, hasOverlappingEntry } from "./needed";
import type {
  BulkEventInput,
  ClockInInput,
  CreateExpectedWindowInput,
  CreateJobCodeInput,
  JobCode,
  ManualEntryInput,
  NeededEntriesFilters,
  TimeEntry,
  TimeExpectedWindow,
  TimeListFilters,
  TimeNeededRow,
  TimeWorker,
  UpsertWorkerInput,
  UpsertSiteInput,
  WorkSite,
} from "@/types/time";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function toDate(value: string): Date {
  return new Date(value);
}

function mapEntry(row: typeof timeEntries.$inferSelect): TimeEntry {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    workerId: row.workerId,
    workerName: row.workerName,
    category: row.category,
    jobCodeId: row.jobCodeId,
    jobCodeLabel: row.jobCodeLabel,
    status: row.status,
    entrySource: row.entrySource,
    clockInAt: toIso(row.clockInAt)!,
    clockOutAt: toIso(row.clockOutAt),
    notes: row.notes ?? undefined,
    eventId: row.eventId ?? undefined,
    eventLabel: row.eventLabel ?? undefined,
    clockInGps: row.clockInGps ?? undefined,
    clockOutGps: row.clockOutGps ?? undefined,
    geofenceResult: (row.geofenceResult as TimeEntry["geofenceResult"]) ?? undefined,
    approvedById: row.approvedById ?? undefined,
    approvedAt: toIso(row.approvedAt),
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

function mapJobCode(row: typeof jobCodes.$inferSelect): JobCode {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    code: row.code,
    label: row.label,
    category: row.category,
    active: row.active,
  };
}

function mapSite(row: typeof workSites.$inferSelect): WorkSite {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    geofenceRadiusM: row.geofenceRadiusM,
    geofenceMode: row.geofenceMode,
    active: row.active,
  };
}

function mapWorker(row: typeof timeWorkers.$inferSelect): TimeWorker {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    displayName: row.displayName,
    userId: row.userId ?? undefined,
    trackGaps: row.trackGaps,
    active: row.active,
  };
}

function mapWindow(
  row: typeof timeExpectedWindows.$inferSelect,
): TimeExpectedWindow {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    label: row.label,
    startsAt: toIso(row.startsAt)!,
    endsAt: toIso(row.endsAt)!,
    category: row.category,
    jobCodeId: row.jobCodeId ?? undefined,
    attendeeWorkerIds: row.attendeeWorkerIds,
    createdById: row.createdById,
    createdAt: toIso(row.createdAt)!,
  };
}

function assertValidRange(clockInAt: string, clockOutAt: string) {
  const start = new Date(clockInAt).getTime();
  const end = new Date(clockOutAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new Error("Invalid time range");
  }
  if (end <= start) {
    throw new Error("clockOutAt must be after clockInAt");
  }
}

export class DrizzleTimeAdapter implements TimeAdapter {
  async listEntries(filters: TimeListFilters): Promise<TimeEntry[]> {
    const db = getDb();
    const conditions = [eq(timeEntries.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(timeEntries.localId, filters.localId));
    }
    if (filters.workerId) {
      conditions.push(eq(timeEntries.workerId, filters.workerId));
    }
    if (filters.category) {
      conditions.push(eq(timeEntries.category, filters.category));
    }
    if (filters.status) {
      conditions.push(eq(timeEntries.status, filters.status));
    }
    if (filters.eventId) {
      conditions.push(eq(timeEntries.eventId, filters.eventId));
    }

    const rows = await db
      .select()
      .from(timeEntries)
      .where(and(...conditions))
      .orderBy(desc(timeEntries.clockInAt));

    let results = rows.map(mapEntry);

    if (filters.from) {
      const fromMs = new Date(filters.from).getTime();
      results = results.filter(
        (e) => new Date(e.clockOutAt ?? e.clockInAt).getTime() >= fromMs,
      );
    }
    if (filters.to) {
      const toMs = new Date(filters.to).getTime();
      results = results.filter((e) => new Date(e.clockInAt).getTime() <= toMs);
    }

    return results;
  }

  async getEntryById(id: string): Promise<TimeEntry | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, id))
      .limit(1);
    return rows[0] ? mapEntry(rows[0]) : null;
  }

  async getActiveEntry(
    workerId: string,
    unionId: string,
  ): Promise<TimeEntry | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.workerId, workerId),
          eq(timeEntries.unionId, unionId),
          eq(timeEntries.status, "active"),
        ),
      )
      .limit(1);
    return rows[0] ? mapEntry(rows[0]) : null;
  }

  async clockIn(
    input: ClockInInput,
    meta: {
      unionId: string;
      localId: string;
      workerId: string;
      workerName: string;
      jobCodeLabel: string;
    },
  ): Promise<TimeEntry> {
    const active = await this.getActiveEntry(meta.workerId, meta.unionId);
    if (active) {
      throw new Error("Already clocked in");
    }

    const localSites = await this.listSites(meta.unionId, meta.localId);
    const geofenceResult = input.clockInGps
      ? checkGeofence(input.clockInGps, localSites)
      : undefined;

    const db = getDb();
    const ts = new Date();
    const id = newId("time");
    const [row] = await db
      .insert(timeEntries)
      .values({
        id,
        unionId: meta.unionId,
        localId: meta.localId,
        workerId: meta.workerId,
        workerName: meta.workerName,
        category: input.category,
        jobCodeId: input.jobCodeId,
        jobCodeLabel: meta.jobCodeLabel,
        status: "active",
        entrySource: "clock",
        clockInAt: ts,
        notes: input.notes,
        clockInGps: input.clockInGps,
        geofenceResult,
        createdAt: ts,
        updatedAt: ts,
      })
      .returning();

    return mapEntry(row);
  }

  async clockOut(
    entryId: string,
    input: { notes?: string; clockOutGps?: TimeEntry["clockOutGps"] },
  ): Promise<TimeEntry | null> {
    const existing = await this.getEntryById(entryId);
    if (!existing || existing.status !== "active") return null;

    const db = getDb();
    const ts = new Date();
    const [row] = await db
      .update(timeEntries)
      .set({
        status: "completed",
        clockOutAt: ts,
        notes: input.notes ?? existing.notes,
        clockOutGps: input.clockOutGps ?? existing.clockOutGps,
        updatedAt: ts,
      })
      .where(eq(timeEntries.id, entryId))
      .returning();

    return row ? mapEntry(row) : null;
  }

  async updateEntryStatus(
    id: string,
    status: TimeEntry["status"],
    meta?: { approvedById?: string },
  ): Promise<TimeEntry | null> {
    const existing = await this.getEntryById(id);
    if (!existing) return null;

    const db = getDb();
    const ts = new Date();
    const [row] = await db
      .update(timeEntries)
      .set({
        status,
        approvedById: meta?.approvedById,
        approvedAt: meta?.approvedById
          ? ts
          : existing.approvedAt
            ? toDate(existing.approvedAt)
            : undefined,
        updatedAt: ts,
      })
      .where(eq(timeEntries.id, id))
      .returning();

    return row ? mapEntry(row) : null;
  }

  async createManualEntry(
    input: ManualEntryInput,
    meta: {
      unionId: string;
      localId: string;
      jobCodeLabel: string;
    },
  ): Promise<TimeEntry> {
    assertValidRange(input.clockInAt, input.clockOutAt);

    const localEntries = await this.listEntries({
      unionId: meta.unionId,
      localId: meta.localId,
    });
    if (
      hasOverlappingEntry(
        localEntries,
        input.workerId,
        input.clockInAt,
        input.clockOutAt,
      )
    ) {
      throw new Error("Overlapping time entry");
    }

    const db = getDb();
    const ts = new Date();
    const [row] = await db
      .insert(timeEntries)
      .values({
        id: newId("time"),
        unionId: meta.unionId,
        localId: meta.localId,
        workerId: input.workerId,
        workerName: input.workerName,
        category: input.category,
        jobCodeId: input.jobCodeId,
        jobCodeLabel: meta.jobCodeLabel,
        status: input.status,
        entrySource: input.entrySource,
        clockInAt: toDate(input.clockInAt),
        clockOutAt: toDate(input.clockOutAt),
        notes: input.notes,
        eventId: input.eventId,
        eventLabel: input.eventLabel,
        createdAt: ts,
        updatedAt: ts,
      })
      .returning();

    return mapEntry(row);
  }

  async createBulkEventEntries(
    input: BulkEventInput,
    meta: {
      unionId: string;
      localId: string;
      jobCodeLabel: string;
    },
  ): Promise<TimeEntry[]> {
    assertValidRange(input.clockInAt, input.clockOutAt);
    if (!input.workers.length) {
      throw new Error("At least one worker is required");
    }
    if (!input.eventLabel.trim()) {
      throw new Error("eventLabel is required");
    }

    const eventId = newId("tev");
    const created: TimeEntry[] = [];
    for (const worker of input.workers) {
      const entry = await this.createManualEntry(
        {
          category: input.category,
          jobCodeId: input.jobCodeId,
          clockInAt: input.clockInAt,
          clockOutAt: input.clockOutAt,
          notes: input.notes,
          eventLabel: input.eventLabel,
          workerId: worker.workerId,
          workerName: worker.workerName,
          status: "submitted",
          entrySource: "bulk_event",
          eventId,
        },
        meta,
      );
      created.push(entry);
    }
    return created;
  }

  async listJobCodes(unionId: string, localId: string): Promise<JobCode[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(jobCodes)
      .where(
        and(
          eq(jobCodes.unionId, unionId),
          eq(jobCodes.localId, localId),
          eq(jobCodes.active, true),
        ),
      );
    return rows.map(mapJobCode);
  }

  async createJobCode(
    input: CreateJobCodeInput,
    meta: { unionId: string; localId: string },
  ): Promise<JobCode> {
    const db = getDb();
    const [row] = await db
      .insert(jobCodes)
      .values({
        id: newId("code"),
        unionId: meta.unionId,
        localId: meta.localId,
        code: input.code,
        label: input.label,
        category: input.category,
        active: true,
      })
      .returning();
    return mapJobCode(row);
  }

  async listSites(unionId: string, localId: string): Promise<WorkSite[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(workSites)
      .where(
        and(eq(workSites.unionId, unionId), eq(workSites.localId, localId)),
      );
    return rows.map(mapSite);
  }

  async upsertSite(
    input: UpsertSiteInput,
    meta: { unionId: string; localId: string },
  ): Promise<WorkSite> {
    const db = getDb();

    if (input.id) {
      const existing = await db
        .select()
        .from(workSites)
        .where(
          and(
            eq(workSites.id, input.id),
            eq(workSites.unionId, meta.unionId),
            eq(workSites.localId, meta.localId),
          ),
        )
        .limit(1);

      if (existing[0]) {
        const [row] = await db
          .update(workSites)
          .set({
            name: input.name,
            lat: input.lat,
            lng: input.lng,
            geofenceRadiusM: input.geofenceRadiusM,
            geofenceMode: input.geofenceMode,
            active: input.active ?? existing[0].active,
          })
          .where(eq(workSites.id, input.id))
          .returning();
        return mapSite(row);
      }
    }

    const [row] = await db
      .insert(workSites)
      .values({
        id: newId("site"),
        unionId: meta.unionId,
        localId: meta.localId,
        name: input.name,
        lat: input.lat,
        lng: input.lng,
        geofenceRadiusM: input.geofenceRadiusM,
        geofenceMode: input.geofenceMode,
        active: input.active ?? true,
      })
      .returning();
    return mapSite(row);
  }

  async listWorkers(unionId: string, localId: string): Promise<TimeWorker[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(timeWorkers)
      .where(
        and(
          eq(timeWorkers.unionId, unionId),
          eq(timeWorkers.localId, localId),
          eq(timeWorkers.active, true),
        ),
      );
    return rows.map(mapWorker);
  }

  async upsertWorker(
    input: UpsertWorkerInput,
    meta: { unionId: string; localId: string },
  ): Promise<TimeWorker> {
    const db = getDb();

    if (input.id) {
      const existing = await db
        .select()
        .from(timeWorkers)
        .where(
          and(
            eq(timeWorkers.id, input.id),
            eq(timeWorkers.unionId, meta.unionId),
            eq(timeWorkers.localId, meta.localId),
          ),
        )
        .limit(1);

      if (existing[0]) {
        const [row] = await db
          .update(timeWorkers)
          .set({
            displayName: input.displayName,
            userId: input.userId ?? existing[0].userId,
            trackGaps: input.trackGaps ?? existing[0].trackGaps,
            active: input.active ?? existing[0].active,
          })
          .where(eq(timeWorkers.id, input.id))
          .returning();
        return mapWorker(row);
      }
    }

    const [row] = await db
      .insert(timeWorkers)
      .values({
        id: newId("tw"),
        unionId: meta.unionId,
        localId: meta.localId,
        displayName: input.displayName,
        userId: input.userId,
        trackGaps: input.trackGaps ?? true,
        active: input.active ?? true,
      })
      .returning();
    return mapWorker(row);
  }

  async listExpectedWindows(
    unionId: string,
    localId: string,
  ): Promise<TimeExpectedWindow[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(timeExpectedWindows)
      .where(
        and(
          eq(timeExpectedWindows.unionId, unionId),
          eq(timeExpectedWindows.localId, localId),
        ),
      )
      .orderBy(desc(timeExpectedWindows.startsAt));
    return rows.map(mapWindow);
  }

  async createExpectedWindow(
    input: CreateExpectedWindowInput,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<TimeExpectedWindow> {
    assertValidRange(input.startsAt, input.endsAt);
    const db = getDb();
    const [row] = await db
      .insert(timeExpectedWindows)
      .values({
        id: newId("twin"),
        unionId: meta.unionId,
        localId: meta.localId,
        label: input.label,
        startsAt: toDate(input.startsAt),
        endsAt: toDate(input.endsAt),
        category: input.category,
        jobCodeId: input.jobCodeId,
        attendeeWorkerIds: input.attendeeWorkerIds,
        createdById: meta.createdById,
        createdAt: new Date(),
      })
      .returning();
    return mapWindow(row);
  }

  async listNeededEntries(
    filters: NeededEntriesFilters,
  ): Promise<TimeNeededRow[]> {
    const localWorkers = await this.listWorkers(
      filters.unionId,
      filters.localId,
    );
    const windows = await this.listExpectedWindows(
      filters.unionId,
      filters.localId,
    );
    const localEntries = await this.listEntries({
      unionId: filters.unionId,
      localId: filters.localId,
      from: filters.from,
      to: filters.to,
    });
    return computeNeededEntries({
      workers: localWorkers,
      windows,
      entries: localEntries,
      from: filters.from,
      to: filters.to,
      workerId: filters.workerId,
    });
  }
}
