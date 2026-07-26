import type {
  BulkEventInput,
  ClockInInput,
  ClockOutInput,
  CreateExpectedWindowInput,
  CreateJobCodeInput,
  CreatePtoRequestInput,
  CreateShiftSeriesInput,
  CreateTimeShiftInput,
  JobCode,
  ManualEntryInput,
  NeededEntriesFilters,
  PtoBalance,
  PtoBalanceFilters,
  PtoListFilters,
  PtoRequest,
  PtoRequestStatus,
  PtoAccrualPolicy,
  PayrollExportProfile,
  ShiftListFilters,
  TimeEntry,
  TimeExpectedWindow,
  TimeListFilters,
  TimeNeededRow,
  TimeOtPolicy,
  TimeShift,
  TimeShiftSeries,
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
  listWorkers(filters: WorkerListFilters): Promise<TimeWorker[]>;
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
  listPtoRequests(filters: PtoListFilters): Promise<PtoRequest[]>;
  getPtoRequestById(id: string): Promise<PtoRequest | null>;
  createPtoRequest(
    input: CreatePtoRequestInput,
    meta: { unionId: string; localId: string; requestedById: string },
  ): Promise<PtoRequest>;
  updatePtoRequestStatus(
    id: string,
    status: PtoRequestStatus,
    meta?: { approvedById?: string },
  ): Promise<PtoRequest | null>;
  listPtoBalances(filters: PtoBalanceFilters): Promise<PtoBalance[]>;
  upsertPtoBalance(
    input: UpsertPtoBalanceInput,
    meta: { unionId: string; localId: string; updatedById: string },
  ): Promise<PtoBalance>;
  listShifts(filters: ShiftListFilters): Promise<TimeShift[]>;
  getShiftById(id: string): Promise<TimeShift | null>;
  createShift(
    input: CreateTimeShiftInput,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<TimeShift>;
  updateShift(
    id: string,
    input: UpdateTimeShiftInput,
  ): Promise<TimeShift | null>;
  listWorkerGroups(unionId: string, localId: string): Promise<TimeWorkerGroup[]>;
  upsertWorkerGroup(
    input: UpsertWorkerGroupInput,
    meta: { unionId: string; localId: string },
  ): Promise<TimeWorkerGroup>;
  listOtPolicies(unionId: string, localId: string): Promise<TimeOtPolicy[]>;
  upsertOtPolicy(
    input: UpsertOtPolicyInput,
    meta: { unionId: string; localId: string },
  ): Promise<TimeOtPolicy>;
  listShiftSeries(unionId: string, localId: string): Promise<TimeShiftSeries[]>;
  getShiftSeriesById(id: string): Promise<TimeShiftSeries | null>;
  createShiftSeries(
    input: CreateShiftSeriesInput,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<TimeShiftSeries>;
  updateShiftSeries(
    id: string,
    input: UpdateShiftSeriesInput,
  ): Promise<TimeShiftSeries | null>;
  expandShiftSeries(
    seriesId: string,
    from: string,
    to: string,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<TimeShift[]>;
  listAccrualPolicies(
    unionId: string,
    localId: string,
  ): Promise<PtoAccrualPolicy[]>;
  upsertAccrualPolicy(
    input: UpsertAccrualPolicyInput,
    meta: { unionId: string; localId: string },
  ): Promise<PtoAccrualPolicy>;
  listPayrollProfiles(
    unionId: string,
    localId: string,
  ): Promise<PayrollExportProfile[]>;
  upsertPayrollProfile(
    input: UpsertPayrollProfileInput,
    meta: { unionId: string; localId: string },
  ): Promise<PayrollExportProfile>;
}
