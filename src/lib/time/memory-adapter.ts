import type { TimeAdapter } from "./adapter";
import { checkGeofence } from "./geofence";
import type {
  ClockInInput,
  CreateJobCodeInput,
  JobCode,
  TimeEntry,
  TimeListFilters,
  WorkSite,
} from "@/types/time";

let entrySeq = 1;
let codeSeq = 10;

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

function now() {
  return new Date().toISOString();
}

function nextEntryId() {
  return `time-${String(entrySeq++).padStart(4, "0")}`;
}

function nextCodeId() {
  return `code-${String(codeSeq++).padStart(4, "0")}`;
}

export const timeStore: TimeAdapter = {
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
    return sites.filter(
      (s) => s.unionId === unionId && s.localId === localId && s.active,
    );
  },
};
