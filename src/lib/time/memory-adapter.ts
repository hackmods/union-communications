import type { TimeAdapter } from "./adapter";
import { checkGeofence } from "./geofence";
import { computeNeededEntries, hasOverlappingEntry } from "./needed";
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
  TimeWorker,
  TimePunchPhotoKind,
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
import { DEFAULT_OT_POLICY } from "./ot-policy";
import { buildShiftInstancesFromSeries } from "./shift-recurrence";

let entrySeq = 1;
let codeSeq = 10;
let workerSeq = 1;
let windowSeq = 1;
let eventSeq = 1;
let siteSeq = 1;
let ptoSeq = 1;
let shiftSeq = 1;
let ptoBalanceSeq = 1;
let groupSeq = 1;
let otPolicySeq = 1;
let seriesSeq = 1;
let accrualPolicySeq = 1;
let payrollProfileSeq = 1;

const entries: TimeEntry[] = [];
const jobCodes: JobCode[] = [
  {
    id: "code-staff-office",
    unionId: "union-opseu",
    localId: "local-243",
    code: "OFFICE",
    label: "Office / admin",
    category: "staff",
    active: true,
  },
  {
    id: "code-release-grievance",
    unionId: "union-opseu",
    localId: "local-243",
    code: "GRIEV",
    label: "Grievance handling",
    category: "release",
    active: true,
  },
  {
    id: "code-duty-bank",
    unionId: "union-opseu",
    localId: "local-243",
    code: "DUTY",
    label: "Duty bank",
    category: "duty_bank",
    active: true,
  },
  {
    id: "code-action-picket",
    unionId: "union-opseu",
    localId: "local-243",
    code: "PICKET",
    label: "Picket line",
    category: "action",
    active: true,
  },
  {
    id: "code-volunteer",
    unionId: "union-opseu",
    localId: "local-243",
    code: "SOLID",
    label: "Solidarity volunteer",
    category: "volunteer",
    active: true,
  },
];

const sites: WorkSite[] = [];

const workers: TimeWorker[] = [
  {
    id: "tw-president-243",
    unionId: "union-opseu",
    localId: "local-243",
    displayName: "Local 243 President",
    userId: "user-president-243",
    trackGaps: true,
    active: true,
  },
  {
    id: "tw-steward-243",
    unionId: "union-opseu",
    localId: "local-243",
    displayName: "Local 243 Steward",
    userId: "user-steward-243",
    trackGaps: true,
    active: true,
  },
  {
    id: "tw-stability-243",
    unionId: "union-opseu",
    localId: "local-243",
    displayName: "Stability Committee Rep",
    userId: "user-stability-243",
    trackGaps: false,
    active: true,
  },
];

const expectedWindows: TimeExpectedWindow[] = [];
const ptoRequests: PtoRequest[] = [];
const ptoBalances: PtoBalance[] = [];
const shifts: TimeShift[] = [];
const workerGroups: TimeWorkerGroup[] = [];
const otPolicies: TimeOtPolicy[] = [];
const shiftSeries: TimeShiftSeries[] = [];
const accrualPolicies: PtoAccrualPolicy[] = [];
const payrollProfiles: PayrollExportProfile[] = [];

function now() {
  return new Date().toISOString();
}

function nextEntryId() {
  return `time-${String(entrySeq++).padStart(4, "0")}`;
}

function nextCodeId() {
  return `code-${String(codeSeq++).padStart(4, "0")}`;
}

function nextWorkerId() {
  return `tw-${String(workerSeq++).padStart(4, "0")}`;
}

function nextSiteId() {
  return `site-${String(siteSeq++).padStart(4, "0")}`;
}

function nextWindowId() {
  return `twin-${String(windowSeq++).padStart(4, "0")}`;
}

function nextEventId() {
  return `tev-${String(eventSeq++).padStart(4, "0")}`;
}

function nextPtoId() {
  return `pto-${String(ptoSeq++).padStart(4, "0")}`;
}

function nextShiftId() {
  return `shift-${String(shiftSeq++).padStart(4, "0")}`;
}

function nextPtoBalanceId() {
  return `ptobal-${String(ptoBalanceSeq++).padStart(4, "0")}`;
}

function nextGroupId() {
  return `twg-${String(groupSeq++).padStart(4, "0")}`;
}

function nextOtPolicyId() {
  return `otpol-${String(otPolicySeq++).padStart(4, "0")}`;
}

function nextSeriesId() {
  return `tser-${String(seriesSeq++).padStart(4, "0")}`;
}

function nextAccrualPolicyId() {
  return `accpol-${String(accrualPolicySeq++).padStart(4, "0")}`;
}

function nextPayrollProfileId() {
  return `payprof-${String(payrollProfileSeq++).padStart(4, "0")}`;
}

function applyPtoApprovalDebit(row: PtoRequest, updatedById?: string) {
  const hours = row.hoursRequested;
  if (hours == null || hours <= 0) return;
  const stamp = now();
  let balance = ptoBalances.find(
    (b) =>
      b.unionId === row.unionId &&
      b.localId === row.localId &&
      b.workerId === row.workerId &&
      b.ptoType === row.ptoType,
  );
  if (!balance) {
    balance = {
      id: nextPtoBalanceId(),
      unionId: row.unionId,
      localId: row.localId,
      workerId: row.workerId,
      ptoType: row.ptoType,
      hoursBalance: 0,
      updatedAt: stamp,
      updatedById,
    };
    ptoBalances.push(balance);
  }
  balance.hoursBalance = Number((balance.hoursBalance - hours).toFixed(2));
  balance.updatedAt = stamp;
  balance.updatedById = updatedById;
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

export const memoryTimeStore: TimeAdapter = {
  async listEntries(filters: TimeListFilters): Promise<TimeEntry[]> {
    let results = entries.filter((e) => e.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter((e) => e.localId === filters.localId);
    }
    if (filters.workerId) {
      results = results.filter((e) => e.workerId === filters.workerId);
    }
    if (filters.category) {
      results = results.filter((e) => e.category === filters.category);
    }
    if (filters.status) {
      results = results.filter((e) => e.status === filters.status);
    }
    if (filters.eventId) {
      results = results.filter((e) => e.eventId === filters.eventId);
    }
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
    return results.sort(
      (a, b) =>
        new Date(b.clockInAt).getTime() - new Date(a.clockInAt).getTime(),
    );
  },

  async getEntryById(id: string): Promise<TimeEntry | null> {
    return entries.find((e) => e.id === id) ?? null;
  },

  async getActiveEntry(
    workerId: string,
    unionId: string,
  ): Promise<TimeEntry | null> {
    return (
      entries.find(
        (e) =>
          e.workerId === workerId &&
          e.unionId === unionId &&
          e.status === "active",
      ) ?? null
    );
  },

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

    const localSites = sites.filter(
      (s) =>
        s.unionId === meta.unionId &&
        s.localId === meta.localId &&
        s.active,
    );
    const geofenceResult = input.clockInGps
      ? checkGeofence(input.clockInGps, localSites)
      : undefined;

    const ts = now();
    const entry: TimeEntry = {
      id: nextEntryId(),
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
    };
    entries.push(entry);
    return entry;
  },

  async clockOut(
    entryId: string,
    input: { notes?: string; clockOutGps?: TimeEntry["clockOutGps"] },
  ): Promise<TimeEntry | null> {
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx < 0) return null;
    const entry = entries[idx];
    if (entry.status !== "active") return null;

    const ts = now();
    entries[idx] = {
      ...entry,
      status: "completed",
      clockOutAt: ts,
      notes: input.notes ?? entry.notes,
      clockOutGps: input.clockOutGps ?? entry.clockOutGps,
      updatedAt: ts,
    };
    return entries[idx];
  },

  async updateEntryStatus(
    id: string,
    status: TimeEntry["status"],
    meta?: { approvedById?: string },
  ): Promise<TimeEntry | null> {
    const idx = entries.findIndex((e) => e.id === id);
    if (idx < 0) return null;
    const ts = now();
    entries[idx] = {
      ...entries[idx],
      status,
      approvedById: meta?.approvedById,
      approvedAt: meta?.approvedById ? ts : entries[idx].approvedAt,
      updatedAt: ts,
    };
    return entries[idx];
  },

  async createManualEntry(
    input: ManualEntryInput,
    meta: {
      unionId: string;
      localId: string;
      jobCodeLabel: string;
    },
  ): Promise<TimeEntry> {
    assertValidRange(input.clockInAt, input.clockOutAt);
    if (
      hasOverlappingEntry(
        entries.filter(
          (e) => e.unionId === meta.unionId && e.localId === meta.localId,
        ),
        input.workerId,
        input.clockInAt,
        input.clockOutAt,
      )
    ) {
      throw new Error("Overlapping time entry");
    }

    const ts = now();
    const entry: TimeEntry = {
      id: nextEntryId(),
      unionId: meta.unionId,
      localId: meta.localId,
      workerId: input.workerId,
      workerName: input.workerName,
      category: input.category,
      jobCodeId: input.jobCodeId,
      jobCodeLabel: meta.jobCodeLabel,
      status: input.status,
      entrySource: input.entrySource,
      clockInAt: input.clockInAt,
      clockOutAt: input.clockOutAt,
      notes: input.notes,
      eventId: input.eventId,
      eventLabel: input.eventLabel,
      createdAt: ts,
      updatedAt: ts,
    };
    entries.push(entry);
    return entry;
  },

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

    const eventId = nextEventId();
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
  },

  async listJobCodes(unionId: string, localId: string): Promise<JobCode[]> {
    return jobCodes.filter(
      (c) => c.unionId === unionId && c.localId === localId && c.active,
    );
  },

  async createJobCode(
    input: CreateJobCodeInput,
    meta: { unionId: string; localId: string },
  ): Promise<JobCode> {
    const code: JobCode = {
      id: nextCodeId(),
      unionId: meta.unionId,
      localId: meta.localId,
      code: input.code,
      label: input.label,
      category: input.category,
      active: true,
    };
    jobCodes.push(code);
    return code;
  },

  async listSites(unionId: string, localId: string): Promise<WorkSite[]> {
    return sites.filter((s) => s.unionId === unionId && s.localId === localId);
  },

  async upsertSite(
    input: UpsertSiteInput,
    meta: { unionId: string; localId: string },
  ): Promise<WorkSite> {
    if (input.id) {
      const idx = sites.findIndex(
        (s) =>
          s.id === input.id &&
          s.unionId === meta.unionId &&
          s.localId === meta.localId,
      );
      if (idx >= 0) {
        sites[idx] = {
          ...sites[idx],
          name: input.name,
          lat: input.lat,
          lng: input.lng,
          geofenceRadiusM: input.geofenceRadiusM,
          geofenceMode: input.geofenceMode,
          active: input.active ?? sites[idx].active,
        };
        return sites[idx];
      }
    }

    const site: WorkSite = {
      id: nextSiteId(),
      unionId: meta.unionId,
      localId: meta.localId,
      name: input.name,
      lat: input.lat,
      lng: input.lng,
      geofenceRadiusM: input.geofenceRadiusM,
      geofenceMode: input.geofenceMode,
      active: input.active ?? true,
    };
    sites.push(site);
    return site;
  },

  async listWorkers(filters: WorkerListFilters): Promise<TimeWorker[]> {
    return workers.filter((w) => {
      if (w.unionId !== filters.unionId || w.localId !== filters.localId) {
        return false;
      }
      if (!filters.includeInactive && !w.active) return false;
      if (
        filters.groupId &&
        !(w.groupIds ?? []).includes(filters.groupId)
      ) {
        return false;
      }
      return true;
    });
  },

  async upsertWorker(
    input: UpsertWorkerInput,
    meta: { unionId: string; localId: string },
  ): Promise<TimeWorker> {
    if (input.id) {
      const idx = workers.findIndex(
        (w) =>
          w.id === input.id &&
          w.unionId === meta.unionId &&
          w.localId === meta.localId,
      );
      if (idx >= 0) {
        workers[idx] = {
          ...workers[idx],
          displayName: input.displayName,
          userId: input.userId ?? workers[idx].userId,
          trackGaps: input.trackGaps ?? workers[idx].trackGaps,
          active: input.active ?? workers[idx].active,
          gpsConsentAt:
            input.gpsConsentAt === null
              ? undefined
              : (input.gpsConsentAt ?? workers[idx].gpsConsentAt),
          employeeNumber: input.employeeNumber ?? workers[idx].employeeNumber,
          email: input.email ?? workers[idx].email,
          phone: input.phone ?? workers[idx].phone,
          jobTitle: input.jobTitle ?? workers[idx].jobTitle,
          department: input.department ?? workers[idx].department,
          hireDate: input.hireDate ?? workers[idx].hireDate,
          employmentType:
            input.employmentType ?? workers[idx].employmentType,
          defaultJobCodeId:
            input.defaultJobCodeId ?? workers[idx].defaultJobCodeId,
          supervisorWorkerId:
            input.supervisorWorkerId ?? workers[idx].supervisorWorkerId,
          notes: input.notes ?? workers[idx].notes,
          groupIds: input.groupIds ?? workers[idx].groupIds,
        };
        return workers[idx];
      }
    }

    const worker: TimeWorker = {
      id: nextWorkerId(),
      unionId: meta.unionId,
      localId: meta.localId,
      displayName: input.displayName,
      userId: input.userId,
      trackGaps: input.trackGaps ?? true,
      active: input.active ?? true,
      gpsConsentAt: input.gpsConsentAt ?? undefined,
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
      groupIds: input.groupIds ?? [],
    };
    workers.push(worker);
    return worker;
  },

  async listExpectedWindows(
    unionId: string,
    localId: string,
  ): Promise<TimeExpectedWindow[]> {
    return expectedWindows
      .filter((w) => w.unionId === unionId && w.localId === localId)
      .sort(
        (a, b) =>
          new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
      );
  },

  async createExpectedWindow(
    input: CreateExpectedWindowInput,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<TimeExpectedWindow> {
    assertValidRange(input.startsAt, input.endsAt);
    const window: TimeExpectedWindow = {
      id: nextWindowId(),
      unionId: meta.unionId,
      localId: meta.localId,
      label: input.label,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      category: input.category,
      jobCodeId: input.jobCodeId,
      attendeeWorkerIds: input.attendeeWorkerIds,
      createdById: meta.createdById,
      createdAt: now(),
    };
    expectedWindows.push(window);
    return window;
  },

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
  },

  async listPtoRequests(filters: PtoListFilters): Promise<PtoRequest[]> {
    return ptoRequests
      .filter((r) => {
        if (r.unionId !== filters.unionId) return false;
        if (filters.localId && r.localId !== filters.localId) return false;
        if (filters.workerId && r.workerId !== filters.workerId) return false;
        if (filters.status && r.status !== filters.status) return false;
        if (filters.from && r.endsAt < filters.from) return false;
        if (filters.to && r.startsAt > filters.to) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getPtoRequestById(id: string): Promise<PtoRequest | null> {
    return ptoRequests.find((r) => r.id === id) ?? null;
  },

  async createPtoRequest(
    input: CreatePtoRequestInput,
    meta: { unionId: string; localId: string; requestedById: string },
  ): Promise<PtoRequest> {
    assertValidRange(input.startsAt, input.endsAt);
    const stamp = now();
    const row: PtoRequest = {
      id: nextPtoId(),
      unionId: meta.unionId,
      localId: meta.localId,
      workerId: input.workerId,
      workerName: input.workerName,
      ptoType: input.ptoType,
      status: input.status ?? "submitted",
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      hoursRequested: input.hoursRequested,
      notes: input.notes,
      requestedById: meta.requestedById,
      createdAt: stamp,
      updatedAt: stamp,
    };
    ptoRequests.push(row);
    return row;
  },

  async updatePtoRequestStatus(
    id: string,
    status: PtoRequestStatus,
    meta?: { approvedById?: string },
  ): Promise<PtoRequest | null> {
    const row = ptoRequests.find((r) => r.id === id);
    if (!row) return null;
    const prev = row.status;
    row.status = status;
    row.updatedAt = now();
    if (status === "approved" || status === "rejected") {
      row.approvedById = meta?.approvedById;
      row.approvedAt = now();
    }
    if (status === "approved" && prev !== "approved") {
      applyPtoApprovalDebit(row, meta?.approvedById);
    }
    return row;
  },

  async listPtoBalances(filters: PtoBalanceFilters): Promise<PtoBalance[]> {
    return ptoBalances
      .filter((b) => {
        if (b.unionId !== filters.unionId) return false;
        if (filters.localId && b.localId !== filters.localId) return false;
        if (filters.workerId && b.workerId !== filters.workerId) return false;
        if (filters.ptoType && b.ptoType !== filters.ptoType) return false;
        return true;
      })
      .sort((a, b) => a.workerId.localeCompare(b.workerId));
  },

  async upsertPtoBalance(
    input: UpsertPtoBalanceInput,
    meta: { unionId: string; localId: string; updatedById: string },
  ): Promise<PtoBalance> {
    const stamp = now();
    let row = ptoBalances.find(
      (b) =>
        b.unionId === meta.unionId &&
        b.localId === meta.localId &&
        b.workerId === input.workerId &&
        b.ptoType === input.ptoType,
    );
    if (!row) {
      row = {
        id: nextPtoBalanceId(),
        unionId: meta.unionId,
        localId: meta.localId,
        workerId: input.workerId,
        ptoType: input.ptoType,
        hoursBalance: 0,
        updatedAt: stamp,
        updatedById: meta.updatedById,
      };
      ptoBalances.push(row);
    }
    row.hoursBalance =
      input.mode === "set"
        ? Number(input.hours.toFixed(2))
        : Number((row.hoursBalance + input.hours).toFixed(2));
    row.updatedAt = stamp;
    row.updatedById = meta.updatedById;
    return row;
  },

  async listShifts(filters: ShiftListFilters): Promise<TimeShift[]> {
    return shifts
      .filter((s) => {
        if (s.unionId !== filters.unionId) return false;
        if (filters.localId && s.localId !== filters.localId) return false;
        if (filters.workerId && !s.assignedWorkerIds.includes(filters.workerId)) {
          return false;
        }
        if (filters.status && s.status !== filters.status) return false;
        if (filters.from && s.endsAt < filters.from) return false;
        if (filters.to && s.startsAt > filters.to) return false;
        return true;
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  },

  async getShiftById(id: string): Promise<TimeShift | null> {
    return shifts.find((s) => s.id === id) ?? null;
  },

  async createShift(
    input: CreateTimeShiftInput,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<TimeShift> {
    assertValidRange(input.startsAt, input.endsAt);
    const stamp = now();
    const row: TimeShift = {
      id: nextShiftId(),
      unionId: meta.unionId,
      localId: meta.localId,
      label: input.label.trim(),
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      category: input.category,
      siteId: input.siteId,
      jobCodeId: input.jobCodeId,
      assignedWorkerIds: [...input.assignedWorkerIds],
      status: input.status ?? "draft",
      createdById: meta.createdById,
      createdAt: stamp,
      updatedAt: stamp,
    };
    shifts.push(row);
    return row;
  },

  async updateShift(
    id: string,
    input: UpdateTimeShiftInput,
  ): Promise<TimeShift | null> {
    const row = shifts.find((s) => s.id === id);
    if (!row) return null;
    if (input.label !== undefined) row.label = input.label.trim();
    if (input.startsAt !== undefined) row.startsAt = input.startsAt;
    if (input.endsAt !== undefined) row.endsAt = input.endsAt;
    if (input.category !== undefined) row.category = input.category;
    if (input.siteId !== undefined) {
      row.siteId = input.siteId ?? undefined;
    }
    if (input.jobCodeId !== undefined) {
      row.jobCodeId = input.jobCodeId ?? undefined;
    }
    if (input.assignedWorkerIds !== undefined) {
      row.assignedWorkerIds = [...input.assignedWorkerIds];
    }
    if (input.status !== undefined) row.status = input.status;
    assertValidRange(row.startsAt, row.endsAt);
    row.updatedAt = now();
    return row;
  },

  async listWorkerGroups(
    unionId: string,
    localId: string,
  ): Promise<TimeWorkerGroup[]> {
    return workerGroups
      .filter((g) => g.unionId === unionId && g.localId === localId && g.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async upsertWorkerGroup(
    input: UpsertWorkerGroupInput,
    meta: { unionId: string; localId: string },
  ): Promise<TimeWorkerGroup> {
    const stamp = now();
    if (input.id) {
      const idx = workerGroups.findIndex(
        (g) =>
          g.id === input.id &&
          g.unionId === meta.unionId &&
          g.localId === meta.localId,
      );
      if (idx >= 0) {
        workerGroups[idx] = {
          ...workerGroups[idx],
          name: input.name.trim(),
          description: input.description ?? workerGroups[idx].description,
          memberWorkerIds:
            input.memberWorkerIds ?? workerGroups[idx].memberWorkerIds,
          active: input.active ?? workerGroups[idx].active,
          updatedAt: stamp,
        };
        return workerGroups[idx];
      }
    }
    const row: TimeWorkerGroup = {
      id: nextGroupId(),
      unionId: meta.unionId,
      localId: meta.localId,
      name: input.name.trim(),
      description: input.description,
      memberWorkerIds: input.memberWorkerIds ?? [],
      active: input.active ?? true,
      createdAt: stamp,
      updatedAt: stamp,
    };
    workerGroups.push(row);
    return row;
  },

  async listOtPolicies(
    unionId: string,
    localId: string,
  ): Promise<TimeOtPolicy[]> {
    return otPolicies.filter(
      (p) => p.unionId === unionId && p.localId === localId,
    );
  },

  async upsertOtPolicy(
    input: UpsertOtPolicyInput,
    meta: { unionId: string; localId: string },
  ): Promise<TimeOtPolicy> {
    const stamp = now();
    if (input.id) {
      const idx = otPolicies.findIndex(
        (p) =>
          p.id === input.id &&
          p.unionId === meta.unionId &&
          p.localId === meta.localId,
      );
      if (idx >= 0) {
        const prev = otPolicies[idx];
        otPolicies[idx] = {
          ...prev,
          name: input.name.trim(),
          payPeriodType: input.payPeriodType ?? prev.payPeriodType,
          payPeriodDays: input.payPeriodDays ?? prev.payPeriodDays,
          payPeriodAnchor: input.payPeriodAnchor ?? prev.payPeriodAnchor,
          dailyRegularHours:
            input.dailyRegularHours ?? prev.dailyRegularHours,
          dailyOtThreshold: input.dailyOtThreshold ?? prev.dailyOtThreshold,
          weeklyRegularHours:
            input.weeklyRegularHours ?? prev.weeklyRegularHours,
          dailyDoubleThreshold:
            input.dailyDoubleThreshold ?? prev.dailyDoubleThreshold,
          otMultiplier: input.otMultiplier ?? prev.otMultiplier,
          doubleTimeMultiplier:
            input.doubleTimeMultiplier ?? prev.doubleTimeMultiplier,
          holidayDates: input.holidayDates ?? prev.holidayDates,
          holidayMultiplier: input.holidayMultiplier ?? prev.holidayMultiplier,
          categoryOtEligible:
            input.categoryOtEligible ?? prev.categoryOtEligible,
          active: input.active ?? prev.active,
          updatedAt: stamp,
        };
        return otPolicies[idx];
      }
    }
    const row: TimeOtPolicy = {
      id: nextOtPolicyId(),
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
    };
    otPolicies.push(row);
    return row;
  },

  async listShiftSeries(
    unionId: string,
    localId: string,
  ): Promise<TimeShiftSeries[]> {
    return shiftSeries
      .filter((s) => s.unionId === unionId && s.localId === localId)
      .sort((a, b) => a.label.localeCompare(b.label));
  },

  async getShiftSeriesById(id: string): Promise<TimeShiftSeries | null> {
    return shiftSeries.find((s) => s.id === id) ?? null;
  },

  async createShiftSeries(
    input: CreateShiftSeriesInput,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<TimeShiftSeries> {
    const stamp = now();
    const row: TimeShiftSeries = {
      id: nextSeriesId(),
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
    };
    shiftSeries.push(row);
    return row;
  },

  async updateShiftSeries(
    id: string,
    input: UpdateShiftSeriesInput,
  ): Promise<TimeShiftSeries | null> {
    const row = shiftSeries.find((s) => s.id === id);
    if (!row) return null;
    if (input.label !== undefined) row.label = input.label.trim();
    if (input.startTime !== undefined) row.startTime = input.startTime;
    if (input.durationMinutes !== undefined) {
      row.durationMinutes = input.durationMinutes;
    }
    if (input.category !== undefined) row.category = input.category;
    if (input.siteId !== undefined) row.siteId = input.siteId ?? undefined;
    if (input.jobCodeId !== undefined) {
      row.jobCodeId = input.jobCodeId ?? undefined;
    }
    if (input.assignedWorkerIds !== undefined) {
      row.assignedWorkerIds = [...input.assignedWorkerIds];
    }
    if (input.recurrence !== undefined) row.recurrence = input.recurrence;
    if (input.status !== undefined) row.status = input.status;
    row.updatedAt = now();
    return row;
  },

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
    for (const inst of instances) {
      const dateKey = inst.startsAt.slice(0, 10);
      const exists = shifts.some(
        (s) =>
          s.seriesId === seriesId && s.seriesOccurrenceDate === dateKey,
      );
      if (exists) continue;
      const shift = await this.createShift(inst, {
        unionId: meta.unionId,
        localId: meta.localId,
        createdById: meta.createdById,
      });
      const row = shifts.find((s) => s.id === shift.id);
      if (row) {
        row.seriesId = seriesId;
        row.seriesOccurrenceDate = dateKey;
      }
      created.push({ ...shift, seriesId, seriesOccurrenceDate: dateKey });
    }
    return created;
  },

  async listAccrualPolicies(
    unionId: string,
    localId: string,
  ): Promise<PtoAccrualPolicy[]> {
    return accrualPolicies.filter(
      (p) => p.unionId === unionId && p.localId === localId,
    );
  },

  async upsertAccrualPolicy(
    input: UpsertAccrualPolicyInput,
    meta: { unionId: string; localId: string },
  ): Promise<PtoAccrualPolicy> {
    const stamp = now();
    if (input.id) {
      const idx = accrualPolicies.findIndex(
        (p) =>
          p.id === input.id &&
          p.unionId === meta.unionId &&
          p.localId === meta.localId,
      );
      if (idx >= 0) {
        const prev = accrualPolicies[idx];
        accrualPolicies[idx] = {
          ...prev,
          name: input.name.trim(),
          ptoType: input.ptoType,
          formulaType: input.formulaType,
          hoursWorkedRate: input.hoursWorkedRate ?? prev.hoursWorkedRate,
          eligibleCategories:
            input.eligibleCategories ?? prev.eligibleCategories,
          fixedHoursPerPeriod:
            input.fixedHoursPerPeriod ?? prev.fixedHoursPerPeriod,
          periodDays: input.periodDays ?? prev.periodDays,
          tenureTiers: input.tenureTiers ?? prev.tenureTiers,
          active: input.active ?? prev.active,
          updatedAt: stamp,
        };
        return accrualPolicies[idx];
      }
    }
    const row: PtoAccrualPolicy = {
      id: nextAccrualPolicyId(),
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
    };
    accrualPolicies.push(row);
    return row;
  },

  async listPayrollProfiles(
    unionId: string,
    localId: string,
  ): Promise<PayrollExportProfile[]> {
    return payrollProfiles.filter(
      (p) => p.unionId === unionId && p.localId === localId,
    );
  },

  async upsertPayrollProfile(
    input: UpsertPayrollProfileInput,
    meta: { unionId: string; localId: string },
  ): Promise<PayrollExportProfile> {
    const stamp = now();
    if (input.id) {
      const idx = payrollProfiles.findIndex(
        (p) =>
          p.id === input.id &&
          p.unionId === meta.unionId &&
          p.localId === meta.localId,
      );
      if (idx >= 0) {
        const prev = payrollProfiles[idx];
        payrollProfiles[idx] = {
          ...prev,
          name: input.name.trim(),
          vendor: input.vendor,
          fieldMapping: input.fieldMapping ?? prev.fieldMapping,
          webhookUrl: input.webhookUrl ?? prev.webhookUrl,
          includeOtBreakdown:
            input.includeOtBreakdown ?? prev.includeOtBreakdown,
          active: input.active ?? prev.active,
          updatedAt: stamp,
        };
        return payrollProfiles[idx];
      }
    }
    const row: PayrollExportProfile = {
      id: nextPayrollProfileId(),
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
    };
    payrollProfiles.push(row);
    return row;
  },

  async importLocalSlice(
    unionId: string,
    localId: string,
    items: TimeEntry[],
    mode: "merge" | "replace",
  ): Promise<{ imported: number; removed: number }> {
    let removed = 0;
    if (mode === "replace") {
      const removeIds = new Set(
        entries
          .filter((e) => e.unionId === unionId && e.localId === localId)
          .map((e) => e.id),
      );
      removed = removeIds.size;
      for (let i = entries.length - 1; i >= 0; i--) {
        if (removeIds.has(entries[i].id)) entries.splice(i, 1);
      }
    }

    let imported = 0;
    for (const item of items) {
      if (item.unionId !== unionId || item.localId !== localId) continue;
      const idx = entries.findIndex((e) => e.id === item.id);
      if (idx >= 0) {
        entries[idx] = { ...item };
      } else {
        entries.push({ ...item });
      }
      imported += 1;
    }
    return { imported, removed };
  },

  async linkPunchPhoto(
    entryId: string,
    kind: TimePunchPhotoKind,
    attachmentId: string,
  ): Promise<TimeEntry | null> {
    const row = entries.find((e) => e.id === entryId);
    if (!row) return null;
    if (kind === "clock_in") {
      row.clockInPhotoAttachmentId = attachmentId;
    } else {
      row.clockOutPhotoAttachmentId = attachmentId;
    }
    row.updatedAt = now();
    return row;
  },
};
