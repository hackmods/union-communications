import type {
  ClockInInput,
  ClockOutInput,
  CreateJobCodeInput,
  JobCode,
  TimeEntry,
  TimeListFilters,
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
  listJobCodes(unionId: string, localId: string): Promise<JobCode[]>;
  createJobCode(
    input: CreateJobCodeInput,
    meta: { unionId: string; localId: string },
  ): Promise<JobCode>;
  listSites(unionId: string, localId: string): Promise<WorkSite[]>;
}
