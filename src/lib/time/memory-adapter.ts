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

let entrySeq = 1;
let codeSeq = 10;
let workerSeq = 1;
let windowSeq = 1;
let eventSeq = 1;
let siteSeq = 1;

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

  async listWorkers(unionId: string, localId: string): Promise<TimeWorker[]> {
    return workers.filter(
      (w) => w.unionId === unionId && w.localId === localId && w.active,
    );
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
  },
};
