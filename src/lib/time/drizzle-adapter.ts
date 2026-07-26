import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  jobCodes,
  payrollExportProfiles,
  ptoAccrualPolicies,
  ptoBalances,
  ptoRequests,
  timeEntries,
  timeExpectedWindows,
  timeOtPolicies,
  timeShiftSeries,
  timeShifts,
  timeWorkerGroups,
  timeWorkers,
  workSites,
} from "@/lib/db/schema";
import type { TimeAdapter } from "./adapter";
import { checkGeofence } from "./geofence";
import { computeNeededEntries, hasOverlappingEntry } from "./needed";
import { DEFAULT_OT_POLICY } from "./ot-policy";
import { buildShiftInstancesFromSeries } from "./shift-recurrence";
import type {
  BulkEventInput,
  ClockInInput,
  CreateExpectedWindowInput,
  CreateJobCodeInput,
  CreatePtoRequestInput,
  CreateShiftSeriesInput,
  CreateTimeShiftInput,
  JobCode,
  ManualEntryInput,
  NeededEntriesFilters,
  PayrollExportProfile,
  PtoAccrualPolicy,
  PtoBalance,
  PtoBalanceFilters,
  PtoListFilters,
  PtoRequest,
  PtoRequestStatus,
  ShiftListFilters,
  TimeEntry,
  TimeExpectedWindow,
  TimeListFilters,
  TimeNeededRow,
  TimeOtPolicy,
  TimeShift,
  TimeShiftSeries,
  TimePunchPhotoKind,
  TimeWorker,
  TimeWorkerGroup,
  UpdateShiftSeriesInput,
  UpdateTimeShiftInput,
  UpsertAccrualPolicyInput,
  UpsertOtPolicyInput,
  UpsertPayrollProfileInput,
  UpsertPtoBalanceInput,
  UpsertWorkerGroupInput,
  UpsertWorkerInput,
  UpsertSiteInput,
  WorkerListFilters,
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
    shiftId: row.shiftId ?? undefined,
    clockInGps: row.clockInGps ?? undefined,
    clockOutGps: row.clockOutGps ?? undefined,
    geofenceResult: (row.geofenceResult as TimeEntry["geofenceResult"]) ?? undefined,
    approvedById: row.approvedById ?? undefined,
    approvedAt: toIso(row.approvedAt),
    clockInPhotoAttachmentId: row.clockInPhotoAttachmentId ?? undefined,
    clockOutPhotoAttachmentId: row.clockOutPhotoAttachmentId ?? undefined,
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
    gpsConsentAt: toIso(row.gpsConsentAt),
    employeeNumber: row.employeeNumber ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    jobTitle: row.jobTitle ?? undefined,
    department: row.department ?? undefined,
    hireDate: row.hireDate ?? undefined,
    employmentType: row.employmentType ?? undefined,
    defaultJobCodeId: row.defaultJobCodeId ?? undefined,
    supervisorWorkerId: row.supervisorWorkerId ?? undefined,
    notes: row.notes ?? undefined,
    groupIds: row.groupIds ?? undefined,
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

function mapPtoRequest(row: typeof ptoRequests.$inferSelect): PtoRequest {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    workerId: row.workerId,
    workerName: row.workerName,
    ptoType: row.ptoType,
    status: row.status,
    startsAt: toIso(row.startsAt)!,
    endsAt: toIso(row.endsAt)!,
    hoursRequested: row.hoursRequested ?? undefined,
    notes: row.notes ?? undefined,
    requestedById: row.requestedById,
    approvedById: row.approvedById ?? undefined,
    approvedAt: toIso(row.approvedAt),
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

function mapPtoBalance(row: typeof ptoBalances.$inferSelect): PtoBalance {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    workerId: row.workerId,
    ptoType: row.ptoType,
    hoursBalance: row.hoursBalance,
    updatedAt: toIso(row.updatedAt)!,
    updatedById: row.updatedById ?? undefined,
  };
}

function mapShift(row: typeof timeShifts.$inferSelect): TimeShift {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    label: row.label,
    startsAt: toIso(row.startsAt)!,
    endsAt: toIso(row.endsAt)!,
    category: row.category,
    siteId: row.siteId ?? undefined,
    jobCodeId: row.jobCodeId ?? undefined,
    assignedWorkerIds: row.assignedWorkerIds,
    status: row.status,
    createdById: row.createdById,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
    seriesId: row.seriesId ?? undefined,
    seriesOccurrenceDate: row.seriesOccurrenceDate ?? undefined,
  };
}

function mapWorkerGroup(
  row: typeof timeWorkerGroups.$inferSelect,
): TimeWorkerGroup {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    name: row.name,
    description: row.description ?? undefined,
    memberWorkerIds: row.memberWorkerIds,
    active: row.active,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

function mapOtPolicy(row: typeof timeOtPolicies.$inferSelect): TimeOtPolicy {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    name: row.name,
    payPeriodType: row.payPeriodType,
    payPeriodDays: row.payPeriodDays ?? undefined,
    payPeriodAnchor: row.payPeriodAnchor ?? undefined,
    dailyRegularHours: row.dailyRegularHours,
    dailyOtThreshold: row.dailyOtThreshold,
    weeklyRegularHours: row.weeklyRegularHours,
    dailyDoubleThreshold: row.dailyDoubleThreshold ?? undefined,
    otMultiplier: row.otMultiplier,
    doubleTimeMultiplier: row.doubleTimeMultiplier,
    holidayDates: row.holidayDates ?? undefined,
    holidayMultiplier: row.holidayMultiplier,
    categoryOtEligible: row.categoryOtEligible ?? undefined,
    active: row.active,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

function mapShiftSeries(
  row: typeof timeShiftSeries.$inferSelect,
): TimeShiftSeries {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    label: row.label,
    startTime: row.startTime,
    durationMinutes: row.durationMinutes,
    category: row.category,
    siteId: row.siteId ?? undefined,
    jobCodeId: row.jobCodeId ?? undefined,
    assignedWorkerIds: row.assignedWorkerIds,
    recurrence: row.recurrence,
    status: row.status,
    createdById: row.createdById,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

function mapAccrualPolicy(
  row: typeof ptoAccrualPolicies.$inferSelect,
): PtoAccrualPolicy {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    name: row.name,
    ptoType: row.ptoType,
    formulaType: row.formulaType,
    hoursWorkedRate: row.hoursWorkedRate ?? undefined,
    eligibleCategories: row.eligibleCategories ?? undefined,
    fixedHoursPerPeriod: row.fixedHoursPerPeriod ?? undefined,
    periodDays: row.periodDays ?? undefined,
    tenureTiers: row.tenureTiers ?? undefined,
    active: row.active,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

function mapPayrollProfile(
  row: typeof payrollExportProfiles.$inferSelect,
): PayrollExportProfile {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    name: row.name,
    vendor: row.vendor,
    fieldMapping: row.fieldMapping,
    webhookUrl: row.webhookUrl ?? undefined,
    includeOtBreakdown: row.includeOtBreakdown,
    active: row.active,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
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
        shiftId: input.shiftId,
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

  async listWorkers(filters: WorkerListFilters): Promise<TimeWorker[]> {
    const db = getDb();
    const clauses = [
      eq(timeWorkers.unionId, filters.unionId),
      eq(timeWorkers.localId, filters.localId),
    ];
    if (!filters.includeInactive) {
      clauses.push(eq(timeWorkers.active, true));
    }
    const rows = await db
      .select()
      .from(timeWorkers)
      .where(and(...clauses));
    return rows
      .map(mapWorker)
      .filter((w) =>
        filters.groupId
          ? (w.groupIds ?? []).includes(filters.groupId)
          : true,
      );
  }

  async upsertWorker(
    input: UpsertWorkerInput,
    meta: { unionId: string; localId: string },
  ): Promise<TimeWorker> {
    const db = getDb();
    const workerFields = {
      displayName: input.displayName,
      userId: input.userId,
      trackGaps: input.trackGaps,
      active: input.active,
      gpsConsentAt:
        input.gpsConsentAt === null
          ? null
          : input.gpsConsentAt
            ? toDate(input.gpsConsentAt)
            : undefined,
      employeeNumber: input.employeeNumber,
      email: input.email,
      phone: input.phone,
      jobTitle: input.jobTitle,
      department: input.department,
      hireDate: input.hireDate,
      employmentType: input.employmentType,
      defaultJobCodeId: input.defaultJobCodeId,
      supervisorWorkerId: input.supervisorWorkerId,
      notes: input.notes,
      groupIds: input.groupIds,
    };

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
            gpsConsentAt:
              input.gpsConsentAt === null
                ? null
                : input.gpsConsentAt
                  ? toDate(input.gpsConsentAt)
                  : existing[0].gpsConsentAt,
            employeeNumber:
              input.employeeNumber ?? existing[0].employeeNumber,
            email: input.email ?? existing[0].email,
            phone: input.phone ?? existing[0].phone,
            jobTitle: input.jobTitle ?? existing[0].jobTitle,
            department: input.department ?? existing[0].department,
            hireDate: input.hireDate ?? existing[0].hireDate,
            employmentType:
              input.employmentType ?? existing[0].employmentType,
            defaultJobCodeId:
              input.defaultJobCodeId ?? existing[0].defaultJobCodeId,
            supervisorWorkerId:
              input.supervisorWorkerId ?? existing[0].supervisorWorkerId,
            notes: input.notes ?? existing[0].notes,
            groupIds: input.groupIds ?? existing[0].groupIds,
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
        ...workerFields,
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
    const localWorkers = await this.listWorkers({
      unionId: filters.unionId,
      localId: filters.localId,
    });
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

  async listPtoRequests(filters: PtoListFilters): Promise<PtoRequest[]> {
    const db = getDb();
    const clauses = [eq(ptoRequests.unionId, filters.unionId)];
    if (filters.localId) {
      clauses.push(eq(ptoRequests.localId, filters.localId));
    }
    if (filters.workerId) {
      clauses.push(eq(ptoRequests.workerId, filters.workerId));
    }
    if (filters.status) {
      clauses.push(eq(ptoRequests.status, filters.status));
    }
    const rows = await db
      .select()
      .from(ptoRequests)
      .where(and(...clauses))
      .orderBy(desc(ptoRequests.createdAt));
    return rows
      .map(mapPtoRequest)
      .filter((r) => {
        if (filters.from && r.endsAt < filters.from) return false;
        if (filters.to && r.startsAt > filters.to) return false;
        return true;
      });
  }

  async getPtoRequestById(id: string): Promise<PtoRequest | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(ptoRequests)
      .where(eq(ptoRequests.id, id))
      .limit(1);
    return rows[0] ? mapPtoRequest(rows[0]) : null;
  }

  async createPtoRequest(
    input: CreatePtoRequestInput,
    meta: { unionId: string; localId: string; requestedById: string },
  ): Promise<PtoRequest> {
    assertValidRange(input.startsAt, input.endsAt);
    const db = getDb();
    const stamp = new Date();
    const [row] = await db
      .insert(ptoRequests)
      .values({
        id: newId("pto"),
        unionId: meta.unionId,
        localId: meta.localId,
        workerId: input.workerId,
        workerName: input.workerName,
        ptoType: input.ptoType,
        status: input.status ?? "submitted",
        startsAt: toDate(input.startsAt),
        endsAt: toDate(input.endsAt),
        hoursRequested: input.hoursRequested,
        notes: input.notes,
        requestedById: meta.requestedById,
        createdAt: stamp,
        updatedAt: stamp,
      })
      .returning();
    return mapPtoRequest(row);
  }

  async updatePtoRequestStatus(
    id: string,
    status: PtoRequestStatus,
    meta?: { approvedById?: string },
  ): Promise<PtoRequest | null> {
    const existing = await this.getPtoRequestById(id);
    if (!existing) return null;
    const db = getDb();
    const stamp = new Date();
    const patch: Partial<typeof ptoRequests.$inferInsert> = {
      status,
      updatedAt: stamp,
    };
    if (status === "approved" || status === "rejected") {
      patch.approvedById = meta?.approvedById;
      patch.approvedAt = stamp;
    }
    const [row] = await db
      .update(ptoRequests)
      .set(patch)
      .where(eq(ptoRequests.id, id))
      .returning();
    if (!row) return null;
    if (status === "approved" && existing.status !== "approved") {
      const hours = existing.hoursRequested;
      if (hours != null && hours > 0) {
        await this.upsertPtoBalance(
          {
            workerId: existing.workerId,
            ptoType: existing.ptoType,
            hours: -hours,
            mode: "adjust",
          },
          {
            unionId: existing.unionId,
            localId: existing.localId,
            updatedById: meta?.approvedById ?? "system",
          },
        );
      }
    }
    return mapPtoRequest(row);
  }

  async listPtoBalances(filters: PtoBalanceFilters): Promise<PtoBalance[]> {
    const db = getDb();
    const clauses = [eq(ptoBalances.unionId, filters.unionId)];
    if (filters.localId) {
      clauses.push(eq(ptoBalances.localId, filters.localId));
    }
    if (filters.workerId) {
      clauses.push(eq(ptoBalances.workerId, filters.workerId));
    }
    if (filters.ptoType) {
      clauses.push(eq(ptoBalances.ptoType, filters.ptoType));
    }
    const rows = await db
      .select()
      .from(ptoBalances)
      .where(and(...clauses));
    return rows.map(mapPtoBalance);
  }

  async upsertPtoBalance(
    input: UpsertPtoBalanceInput,
    meta: { unionId: string; localId: string; updatedById: string },
  ): Promise<PtoBalance> {
    const db = getDb();
    const stamp = new Date();
    const existing = await db
      .select()
      .from(ptoBalances)
      .where(
        and(
          eq(ptoBalances.unionId, meta.unionId),
          eq(ptoBalances.localId, meta.localId),
          eq(ptoBalances.workerId, input.workerId),
          eq(ptoBalances.ptoType, input.ptoType),
        ),
      )
      .limit(1);
    if (existing[0]) {
      const next =
        input.mode === "set"
          ? Number(input.hours.toFixed(2))
          : Number((existing[0].hoursBalance + input.hours).toFixed(2));
      const [row] = await db
        .update(ptoBalances)
        .set({
          hoursBalance: next,
          updatedAt: stamp,
          updatedById: meta.updatedById,
        })
        .where(eq(ptoBalances.id, existing[0].id))
        .returning();
      return mapPtoBalance(row);
    }
    const initial =
      input.mode === "set"
        ? Number(input.hours.toFixed(2))
        : Number(input.hours.toFixed(2));
    const [row] = await db
      .insert(ptoBalances)
      .values({
        id: newId("ptobal"),
        unionId: meta.unionId,
        localId: meta.localId,
        workerId: input.workerId,
        ptoType: input.ptoType,
        hoursBalance: initial,
        updatedAt: stamp,
        updatedById: meta.updatedById,
      })
      .returning();
    return mapPtoBalance(row);
  }

  async listShifts(filters: ShiftListFilters): Promise<TimeShift[]> {
    const db = getDb();
    const clauses = [eq(timeShifts.unionId, filters.unionId)];
    if (filters.localId) {
      clauses.push(eq(timeShifts.localId, filters.localId));
    }
    if (filters.status) {
      clauses.push(eq(timeShifts.status, filters.status));
    }
    const rows = await db
      .select()
      .from(timeShifts)
      .where(and(...clauses))
      .orderBy(timeShifts.startsAt);
    return rows
      .map(mapShift)
      .filter((s) => {
        if (
          filters.workerId &&
          !s.assignedWorkerIds.includes(filters.workerId)
        ) {
          return false;
        }
        if (filters.from && s.endsAt < filters.from) return false;
        if (filters.to && s.startsAt > filters.to) return false;
        return true;
      });
  }

  async getShiftById(id: string): Promise<TimeShift | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(timeShifts)
      .where(eq(timeShifts.id, id))
      .limit(1);
    return rows[0] ? mapShift(rows[0]) : null;
  }

  async createShift(
    input: CreateTimeShiftInput,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<TimeShift> {
    assertValidRange(input.startsAt, input.endsAt);
    const db = getDb();
    const stamp = new Date();
    const [row] = await db
      .insert(timeShifts)
      .values({
        id: newId("shift"),
        unionId: meta.unionId,
        localId: meta.localId,
        label: input.label.trim(),
        startsAt: toDate(input.startsAt),
        endsAt: toDate(input.endsAt),
        category: input.category,
        siteId: input.siteId,
        jobCodeId: input.jobCodeId,
        assignedWorkerIds: [...input.assignedWorkerIds],
        status: input.status ?? "draft",
        createdById: meta.createdById,
        createdAt: stamp,
        updatedAt: stamp,
      })
      .returning();
    return mapShift(row);
  }

  async updateShift(
    id: string,
    input: UpdateTimeShiftInput,
  ): Promise<TimeShift | null> {
    const existing = await this.getShiftById(id);
    if (!existing) return null;
    const startsAt = input.startsAt ?? existing.startsAt;
    const endsAt = input.endsAt ?? existing.endsAt;
    assertValidRange(startsAt, endsAt);
    const db = getDb();
    const stamp = new Date();
    const patch: Partial<typeof timeShifts.$inferInsert> = {
      updatedAt: stamp,
    };
    if (input.label !== undefined) patch.label = input.label.trim();
    if (input.startsAt !== undefined) patch.startsAt = toDate(input.startsAt);
    if (input.endsAt !== undefined) patch.endsAt = toDate(input.endsAt);
    if (input.category !== undefined) patch.category = input.category;
    if (input.siteId !== undefined) {
      patch.siteId = input.siteId ?? null;
    }
    if (input.jobCodeId !== undefined) {
      patch.jobCodeId = input.jobCodeId ?? null;
    }
    if (input.assignedWorkerIds !== undefined) {
      patch.assignedWorkerIds = [...input.assignedWorkerIds];
    }
    if (input.status !== undefined) patch.status = input.status;
    const [row] = await db
      .update(timeShifts)
      .set(patch)
      .where(eq(timeShifts.id, id))
      .returning();
    return row ? mapShift(row) : null;
  }

  async listWorkerGroups(
    unionId: string,
    localId: string,
  ): Promise<TimeWorkerGroup[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(timeWorkerGroups)
      .where(
        and(
          eq(timeWorkerGroups.unionId, unionId),
          eq(timeWorkerGroups.localId, localId),
          eq(timeWorkerGroups.active, true),
        ),
      );
    return rows.map(mapWorkerGroup).sort((a, b) => a.name.localeCompare(b.name));
  }

  async upsertWorkerGroup(
    input: UpsertWorkerGroupInput,
    meta: { unionId: string; localId: string },
  ): Promise<TimeWorkerGroup> {
    const db = getDb();
    const stamp = new Date();
    if (input.id) {
      const [row] = await db
        .update(timeWorkerGroups)
        .set({
          name: input.name.trim(),
          description: input.description,
          memberWorkerIds: input.memberWorkerIds,
          active: input.active,
          updatedAt: stamp,
        })
        .where(
          and(
            eq(timeWorkerGroups.id, input.id),
            eq(timeWorkerGroups.unionId, meta.unionId),
            eq(timeWorkerGroups.localId, meta.localId),
          ),
        )
        .returning();
      if (row) return mapWorkerGroup(row);
    }
    const [row] = await db
      .insert(timeWorkerGroups)
      .values({
        id: newId("twg"),
        unionId: meta.unionId,
        localId: meta.localId,
        name: input.name.trim(),
        description: input.description,
        memberWorkerIds: input.memberWorkerIds ?? [],
        active: input.active ?? true,
        createdAt: stamp,
        updatedAt: stamp,
      })
      .returning();
    return mapWorkerGroup(row);
  }

  async listOtPolicies(
    unionId: string,
    localId: string,
  ): Promise<TimeOtPolicy[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(timeOtPolicies)
      .where(
        and(
          eq(timeOtPolicies.unionId, unionId),
          eq(timeOtPolicies.localId, localId),
        ),
      );
    return rows.map(mapOtPolicy);
  }

  async upsertOtPolicy(
    input: UpsertOtPolicyInput,
    meta: { unionId: string; localId: string },
  ): Promise<TimeOtPolicy> {
    const db = getDb();
    const stamp = new Date();
    if (input.id) {
      const existing = (
        await db
          .select()
          .from(timeOtPolicies)
          .where(eq(timeOtPolicies.id, input.id))
          .limit(1)
      )[0];
      if (existing) {
        const [row] = await db
          .update(timeOtPolicies)
          .set({
            name: input.name.trim(),
            payPeriodType: input.payPeriodType ?? existing.payPeriodType,
            payPeriodDays: input.payPeriodDays ?? existing.payPeriodDays,
            payPeriodAnchor:
              input.payPeriodAnchor ?? existing.payPeriodAnchor,
            dailyRegularHours:
              input.dailyRegularHours ?? existing.dailyRegularHours,
            dailyOtThreshold:
              input.dailyOtThreshold ?? existing.dailyOtThreshold,
            weeklyRegularHours:
              input.weeklyRegularHours ?? existing.weeklyRegularHours,
            dailyDoubleThreshold:
              input.dailyDoubleThreshold ?? existing.dailyDoubleThreshold,
            otMultiplier: input.otMultiplier ?? existing.otMultiplier,
            doubleTimeMultiplier:
              input.doubleTimeMultiplier ?? existing.doubleTimeMultiplier,
            holidayDates: input.holidayDates ?? existing.holidayDates,
            holidayMultiplier:
              input.holidayMultiplier ?? existing.holidayMultiplier,
            categoryOtEligible:
              input.categoryOtEligible ?? existing.categoryOtEligible,
            active: input.active ?? existing.active,
            updatedAt: stamp,
          })
          .where(eq(timeOtPolicies.id, input.id))
          .returning();
        return mapOtPolicy(row);
      }
    }
    const [row] = await db
      .insert(timeOtPolicies)
      .values({
        id: newId("otpol"),
        unionId: meta.unionId,
        localId: meta.localId,
        name: input.name.trim(),
        payPeriodType: input.payPeriodType ?? DEFAULT_OT_POLICY.payPeriodType,
        payPeriodDays: input.payPeriodDays ?? DEFAULT_OT_POLICY.payPeriodDays,
        payPeriodAnchor: input.payPeriodAnchor,
        dailyRegularHours:
          input.dailyRegularHours ?? DEFAULT_OT_POLICY.dailyRegularHours,
        dailyOtThreshold:
          input.dailyOtThreshold ?? DEFAULT_OT_POLICY.dailyOtThreshold,
        weeklyRegularHours:
          input.weeklyRegularHours ?? DEFAULT_OT_POLICY.weeklyRegularHours,
        dailyDoubleThreshold:
          input.dailyDoubleThreshold ?? DEFAULT_OT_POLICY.dailyDoubleThreshold,
        otMultiplier: input.otMultiplier ?? DEFAULT_OT_POLICY.otMultiplier,
        doubleTimeMultiplier:
          input.doubleTimeMultiplier ?? DEFAULT_OT_POLICY.doubleTimeMultiplier,
        holidayDates: input.holidayDates ?? [],
        holidayMultiplier:
          input.holidayMultiplier ?? DEFAULT_OT_POLICY.holidayMultiplier,
        categoryOtEligible:
          input.categoryOtEligible ?? DEFAULT_OT_POLICY.categoryOtEligible,
        active: input.active ?? true,
        createdAt: stamp,
        updatedAt: stamp,
      })
      .returning();
    return mapOtPolicy(row);
  }

  async listShiftSeries(
    unionId: string,
    localId: string,
  ): Promise<TimeShiftSeries[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(timeShiftSeries)
      .where(
        and(
          eq(timeShiftSeries.unionId, unionId),
          eq(timeShiftSeries.localId, localId),
        ),
      );
    return rows.map(mapShiftSeries).sort((a, b) => a.label.localeCompare(b.label));
  }

  async getShiftSeriesById(id: string): Promise<TimeShiftSeries | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(timeShiftSeries)
      .where(eq(timeShiftSeries.id, id))
      .limit(1);
    return rows[0] ? mapShiftSeries(rows[0]) : null;
  }

  async createShiftSeries(
    input: CreateShiftSeriesInput,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<TimeShiftSeries> {
    const db = getDb();
    const stamp = new Date();
    const [row] = await db
      .insert(timeShiftSeries)
      .values({
        id: newId("tser"),
        unionId: meta.unionId,
        localId: meta.localId,
        label: input.label.trim(),
        startTime: input.startTime,
        durationMinutes: input.durationMinutes,
        category: input.category,
        siteId: input.siteId,
        jobCodeId: input.jobCodeId,
        assignedWorkerIds: [...input.assignedWorkerIds],
        recurrence: input.recurrence,
        status: input.status ?? "draft",
        createdById: meta.createdById,
        createdAt: stamp,
        updatedAt: stamp,
      })
      .returning();
    return mapShiftSeries(row);
  }

  async updateShiftSeries(
    id: string,
    input: UpdateShiftSeriesInput,
  ): Promise<TimeShiftSeries | null> {
    const existing = await this.getShiftSeriesById(id);
    if (!existing) return null;
    const db = getDb();
    const stamp = new Date();
    const [row] = await db
      .update(timeShiftSeries)
      .set({
        label: input.label?.trim() ?? existing.label,
        startTime: input.startTime ?? existing.startTime,
        durationMinutes: input.durationMinutes ?? existing.durationMinutes,
        category: input.category ?? existing.category,
        siteId:
          input.siteId === null ? null : (input.siteId ?? existing.siteId),
        jobCodeId:
          input.jobCodeId === null
            ? null
            : (input.jobCodeId ?? existing.jobCodeId),
        assignedWorkerIds:
          input.assignedWorkerIds ?? existing.assignedWorkerIds,
        recurrence: input.recurrence ?? existing.recurrence,
        status: input.status ?? existing.status,
        updatedAt: stamp,
      })
      .where(eq(timeShiftSeries.id, id))
      .returning();
    return row ? mapShiftSeries(row) : null;
  }

  async expandShiftSeries(
    seriesId: string,
    from: string,
    to: string,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<TimeShift[]> {
    const series = await this.getShiftSeriesById(seriesId);
    if (
      !series ||
      series.unionId !== meta.unionId ||
      series.localId !== meta.localId
    ) {
      return [];
    }
    const instances = buildShiftInstancesFromSeries(series, from, to);
    const created: TimeShift[] = [];
    const db = getDb();
    for (const inst of instances) {
      const dateKey = inst.startsAt.slice(0, 10);
      const existing = await db
        .select()
        .from(timeShifts)
        .where(
          and(
            eq(timeShifts.seriesId, seriesId),
            eq(timeShifts.seriesOccurrenceDate, dateKey),
          ),
        )
        .limit(1);
      if (existing[0]) continue;
      const shift = await this.createShift(inst, meta);
      await db
        .update(timeShifts)
        .set({ seriesId, seriesOccurrenceDate: dateKey })
        .where(eq(timeShifts.id, shift.id));
      created.push({ ...shift, seriesId, seriesOccurrenceDate: dateKey });
    }
    return created;
  }

  async listAccrualPolicies(
    unionId: string,
    localId: string,
  ): Promise<PtoAccrualPolicy[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(ptoAccrualPolicies)
      .where(
        and(
          eq(ptoAccrualPolicies.unionId, unionId),
          eq(ptoAccrualPolicies.localId, localId),
        ),
      );
    return rows.map(mapAccrualPolicy);
  }

  async upsertAccrualPolicy(
    input: UpsertAccrualPolicyInput,
    meta: { unionId: string; localId: string },
  ): Promise<PtoAccrualPolicy> {
    const db = getDb();
    const stamp = new Date();
    if (input.id) {
      const [row] = await db
        .update(ptoAccrualPolicies)
        .set({
          name: input.name.trim(),
          ptoType: input.ptoType,
          formulaType: input.formulaType,
          hoursWorkedRate: input.hoursWorkedRate,
          eligibleCategories: input.eligibleCategories,
          fixedHoursPerPeriod: input.fixedHoursPerPeriod,
          periodDays: input.periodDays,
          tenureTiers: input.tenureTiers,
          active: input.active,
          updatedAt: stamp,
        })
        .where(
          and(
            eq(ptoAccrualPolicies.id, input.id),
            eq(ptoAccrualPolicies.unionId, meta.unionId),
            eq(ptoAccrualPolicies.localId, meta.localId),
          ),
        )
        .returning();
      if (row) return mapAccrualPolicy(row);
    }
    const [row] = await db
      .insert(ptoAccrualPolicies)
      .values({
        id: newId("accpol"),
        unionId: meta.unionId,
        localId: meta.localId,
        name: input.name.trim(),
        ptoType: input.ptoType,
        formulaType: input.formulaType,
        hoursWorkedRate: input.hoursWorkedRate,
        eligibleCategories: input.eligibleCategories,
        fixedHoursPerPeriod: input.fixedHoursPerPeriod,
        periodDays: input.periodDays ?? 14,
        tenureTiers: input.tenureTiers,
        active: input.active ?? true,
        createdAt: stamp,
        updatedAt: stamp,
      })
      .returning();
    return mapAccrualPolicy(row);
  }

  async listPayrollProfiles(
    unionId: string,
    localId: string,
  ): Promise<PayrollExportProfile[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(payrollExportProfiles)
      .where(
        and(
          eq(payrollExportProfiles.unionId, unionId),
          eq(payrollExportProfiles.localId, localId),
        ),
      );
    return rows.map(mapPayrollProfile);
  }

  async upsertPayrollProfile(
    input: UpsertPayrollProfileInput,
    meta: { unionId: string; localId: string },
  ): Promise<PayrollExportProfile> {
    const db = getDb();
    const stamp = new Date();
    if (input.id) {
      const [row] = await db
        .update(payrollExportProfiles)
        .set({
          name: input.name.trim(),
          vendor: input.vendor,
          fieldMapping: input.fieldMapping,
          webhookUrl: input.webhookUrl,
          includeOtBreakdown: input.includeOtBreakdown,
          active: input.active,
          updatedAt: stamp,
        })
        .where(
          and(
            eq(payrollExportProfiles.id, input.id),
            eq(payrollExportProfiles.unionId, meta.unionId),
            eq(payrollExportProfiles.localId, meta.localId),
          ),
        )
        .returning();
      if (row) return mapPayrollProfile(row);
    }
    const [row] = await db
      .insert(payrollExportProfiles)
      .values({
        id: newId("payprof"),
        unionId: meta.unionId,
        localId: meta.localId,
        name: input.name.trim(),
        vendor: input.vendor,
        fieldMapping: input.fieldMapping ?? {},
        webhookUrl: input.webhookUrl,
        includeOtBreakdown: input.includeOtBreakdown ?? true,
        active: input.active ?? true,
        createdAt: stamp,
        updatedAt: stamp,
      })
      .returning();
    return mapPayrollProfile(row);
  }

  async importLocalSlice(
    unionId: string,
    localId: string,
    items: TimeEntry[],
    mode: "merge" | "replace",
  ): Promise<{ imported: number; removed: number }> {
    const db = getDb();
    let removed = 0;

    if (mode === "replace") {
      const existing = await db
        .select({ id: timeEntries.id })
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.unionId, unionId),
            eq(timeEntries.localId, localId),
          ),
        );
      removed = existing.length;
      if (removed > 0) {
        await db
          .delete(timeEntries)
          .where(
            and(
              eq(timeEntries.unionId, unionId),
              eq(timeEntries.localId, localId),
            ),
          );
      }
    }

    let imported = 0;
    for (const item of items) {
      if (item.unionId !== unionId || item.localId !== localId) continue;
      const row = {
        id: item.id,
        unionId: item.unionId,
        localId: item.localId,
        workerId: item.workerId,
        workerName: item.workerName,
        category: item.category,
        jobCodeId: item.jobCodeId,
        jobCodeLabel: item.jobCodeLabel,
        status: item.status,
        entrySource: item.entrySource,
        clockInAt: toDate(item.clockInAt),
        clockOutAt: item.clockOutAt ? toDate(item.clockOutAt) : null,
        notes: item.notes ?? null,
        eventId: item.eventId ?? null,
        eventLabel: item.eventLabel ?? null,
        shiftId: item.shiftId ?? null,
        clockInGps: item.clockInGps ?? null,
        clockOutGps: item.clockOutGps ?? null,
        geofenceResult: item.geofenceResult ?? null,
        approvedById: item.approvedById ?? null,
        approvedAt: item.approvedAt ? toDate(item.approvedAt) : null,
        clockInPhotoAttachmentId: item.clockInPhotoAttachmentId ?? null,
        clockOutPhotoAttachmentId: item.clockOutPhotoAttachmentId ?? null,
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      };
      await db
        .insert(timeEntries)
        .values(row)
        .onConflictDoUpdate({
          target: timeEntries.id,
          set: row,
        });
      imported += 1;
    }
    return { imported, removed };
  }

  async linkPunchPhoto(
    entryId: string,
    kind: TimePunchPhotoKind,
    attachmentId: string,
  ): Promise<TimeEntry | null> {
    const existing = await this.getEntryById(entryId);
    if (!existing) return null;
    const db = getDb();
    const patch =
      kind === "clock_in"
        ? { clockInPhotoAttachmentId: attachmentId }
        : { clockOutPhotoAttachmentId: attachmentId };
    const [row] = await db
      .update(timeEntries)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(timeEntries.id, entryId))
      .returning();
    return row ? mapEntry(row) : null;
  }
}
