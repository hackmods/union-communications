import type {
  BulkEventInput,
  ClockInInput,
  ClockOutInput,
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

export interface TimeAdapter {
  listEntries(filters: TimeListFilters): Promise<TimeEntry[]>;
  getEntryById(id: string): Promise<TimeEntry | null>;
  getActiveEntry(workerId: string, unionId: string): Promise<TimeEntry | null>;
  clockIn(
    input: ClockInInput,
    meta: {
      unionId: string;
      localId: string;
      workerId: string;
      workerName: string;
      jobCodeLabel: string;
    },
  ): Promise<TimeEntry>;
  clockOut(
    entryId: string,
    input: Omit<ClockOutInput, "entryId">,
  ): Promise<TimeEntry | null>;
  updateEntryStatus(
    id: string,
    status: TimeEntry["status"],
    meta?: { approvedById?: string },
  ): Promise<TimeEntry | null>;
  createManualEntry(
    input: ManualEntryInput,
    meta: {
      unionId: string;
      localId: string;
      jobCodeLabel: string;
    },
  ): Promise<TimeEntry>;
  createBulkEventEntries(
    input: BulkEventInput,
    meta: {
      unionId: string;
      localId: string;
      jobCodeLabel: string;
    },
  ): Promise<TimeEntry[]>;
  listJobCodes(unionId: string, localId: string): Promise<JobCode[]>;
  createJobCode(
    input: CreateJobCodeInput,
    meta: { unionId: string; localId: string },
  ): Promise<JobCode>;
  listSites(unionId: string, localId: string): Promise<WorkSite[]>;
  upsertSite(
    input: UpsertSiteInput,
    meta: { unionId: string; localId: string },
  ): Promise<WorkSite>;
  listWorkers(unionId: string, localId: string): Promise<TimeWorker[]>;
  upsertWorker(
    input: UpsertWorkerInput,
    meta: { unionId: string; localId: string },
  ): Promise<TimeWorker>;
  listExpectedWindows(
    unionId: string,
    localId: string,
  ): Promise<TimeExpectedWindow[]>;
  createExpectedWindow(
    input: CreateExpectedWindowInput,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<TimeExpectedWindow>;
  listNeededEntries(filters: NeededEntriesFilters): Promise<TimeNeededRow[]>;
}
