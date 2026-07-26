export type TimeCategory =
  | "staff"
  | "release"
  | "duty_bank"
  | "action"
  | "volunteer";

export type TimeEntryStatus =
  | "active"
  | "completed"
  | "submitted"
  | "approved"
  | "rejected";

export type TimeEntrySource = "clock" | "manual_range" | "bulk_event";

export type GpsPolicy = "off" | "tag_optional" | "tag_required";

export type GeofenceMode = "off" | "warn" | "block";

export interface TimeEntryGps {
  lat: number;
  lng: number;
  accuracyM?: number;
  capturedAt: string;
}

export interface TimeEntry {
  id: string;
  unionId: string;
  localId: string;
  workerId: string;
  workerName: string;
  category: TimeCategory;
  jobCodeId: string;
  jobCodeLabel: string;
  status: TimeEntryStatus;
  entrySource: TimeEntrySource;
  clockInAt: string;
  clockOutAt?: string;
  notes?: string;
  eventId?: string;
  eventLabel?: string;
  /** Optional published shift this punch is for (8c.2). */
  shiftId?: string;
  clockInGps?: TimeEntryGps;
  clockOutGps?: TimeEntryGps;
  geofenceResult?: "ok" | "warn" | "block";
  approvedById?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobCode {
  id: string;
  unionId: string;
  localId: string;
  code: string;
  label: string;
  category: TimeCategory;
  active: boolean;
}

export interface WorkSite {
  id: string;
  unionId: string;
  localId: string;
  name: string;
  lat: number;
  lng: number;
  geofenceRadiusM: number;
  geofenceMode: GeofenceMode;
  active: boolean;
}

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "casual"
  | "contract";

export interface TimeWorker {
  id: string;
  unionId: string;
  localId: string;
  displayName: string;
  userId?: string;
  trackGaps: boolean;
  active: boolean;
  /** ISO timestamp when worker consented to optional GPS punch tags (8e). */
  gpsConsentAt?: string;
  /** Phase 8 full — extended worker directory fields. */
  employeeNumber?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  /** ISO date (YYYY-MM-DD). */
  hireDate?: string;
  employmentType?: EmploymentType;
  defaultJobCodeId?: string;
  supervisorWorkerId?: string;
  notes?: string;
  groupIds?: string[];
}

export interface TimeExpectedWindow {
  id: string;
  unionId: string;
  localId: string;
  label: string;
  startsAt: string;
  endsAt: string;
  category: TimeCategory;
  jobCodeId?: string;
  attendeeWorkerIds: string[];
  createdById: string;
  createdAt: string;
}

export type TimeNeededKind = "expected_window" | "weekday_gap";

export interface TimeNeededRow {
  kind: TimeNeededKind;
  workerId: string;
  workerName: string;
  reason: string;
  windowId?: string;
  windowLabel?: string;
  date?: string;
  startsAt?: string;
  endsAt?: string;
  category?: TimeCategory;
}

export interface TimeListFilters {
  unionId: string;
  localId?: string;
  workerId?: string;
  category?: TimeCategory;
  status?: TimeEntryStatus;
  from?: string;
  to?: string;
  eventId?: string;
}

export interface ClockInInput {
  category: TimeCategory;
  jobCodeId: string;
  notes?: string;
  clockInGps?: TimeEntryGps;
  /** Optional link to a published assigned shift (8c.2). */
  shiftId?: string;
}

export interface ClockOutInput {
  entryId: string;
  notes?: string;
  clockOutGps?: TimeEntryGps;
}

export interface CreateJobCodeInput {
  code: string;
  label: string;
  category: TimeCategory;
}

export interface ManualEntryInput {
  category: TimeCategory;
  jobCodeId: string;
  clockInAt: string;
  clockOutAt: string;
  notes?: string;
  eventLabel?: string;
  workerId: string;
  workerName: string;
  status: Extract<TimeEntryStatus, "completed" | "submitted">;
  entrySource: Extract<TimeEntrySource, "manual_range" | "bulk_event">;
  eventId?: string;
}

export interface BulkEventInput {
  category: TimeCategory;
  jobCodeId: string;
  clockInAt: string;
  clockOutAt: string;
  eventLabel: string;
  notes?: string;
  workers: Array<{ workerId: string; workerName: string }>;
}

export interface CreateExpectedWindowInput {
  label: string;
  startsAt: string;
  endsAt: string;
  category: TimeCategory;
  jobCodeId?: string;
  attendeeWorkerIds: string[];
}

export interface WorkerListFilters {
  unionId: string;
  localId: string;
  /** When true, include inactive workers (admin directory). */
  includeInactive?: boolean;
  groupId?: string;
}

export interface UpsertWorkerInput {
  displayName: string;
  userId?: string;
  trackGaps?: boolean;
  active?: boolean;
  id?: string;
  gpsConsentAt?: string | null;
  employeeNumber?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  hireDate?: string;
  employmentType?: EmploymentType;
  defaultJobCodeId?: string;
  supervisorWorkerId?: string;
  notes?: string;
  groupIds?: string[];
}

export interface UpsertSiteInput {
  name: string;
  lat: number;
  lng: number;
  geofenceRadiusM: number;
  geofenceMode: GeofenceMode;
  active?: boolean;
  id?: string;
}

export interface NeededEntriesFilters {
  unionId: string;
  localId: string;
  from: string;
  to: string;
  workerId?: string;
}

/** 8c.1 — leave requests only (no accrual balances). */
export type PtoType = "vacation" | "sick" | "personal" | "other";

export type PtoRequestStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "cancelled";

export interface PtoRequest {
  id: string;
  unionId: string;
  localId: string;
  workerId: string;
  workerName: string;
  ptoType: PtoType;
  status: PtoRequestStatus;
  startsAt: string;
  endsAt: string;
  hoursRequested?: number;
  notes?: string;
  requestedById: string;
  approvedById?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PtoListFilters {
  unionId: string;
  localId?: string;
  workerId?: string;
  status?: PtoRequestStatus;
  from?: string;
  to?: string;
}

export interface CreatePtoRequestInput {
  workerId: string;
  workerName: string;
  ptoType: PtoType;
  startsAt: string;
  endsAt: string;
  hoursRequested?: number;
  notes?: string;
  /** Default `submitted` for worker self-serve. */
  status?: Extract<PtoRequestStatus, "draft" | "submitted">;
}

/** 8c.3 — accrual hours per worker + leave type (manual set/adjust; approve decrements). */
export interface PtoBalance {
  id: string;
  unionId: string;
  localId: string;
  workerId: string;
  ptoType: PtoType;
  hoursBalance: number;
  updatedAt: string;
  updatedById?: string;
}

export interface PtoBalanceFilters {
  unionId: string;
  localId?: string;
  workerId?: string;
  ptoType?: PtoType;
}

export interface UpsertPtoBalanceInput {
  workerId: string;
  ptoType: PtoType;
  /** Absolute set when `mode` is `set`; delta when `mode` is `adjust`. */
  hours: number;
  mode: "set" | "adjust";
}

/** 8c.2 — admin-published shifts; recurrence via `TimeShiftSeries` (Phase 8 full). */
export type TimeShiftStatus = "draft" | "published" | "cancelled";

export interface TimeShift {
  id: string;
  unionId: string;
  localId: string;
  label: string;
  startsAt: string;
  endsAt: string;
  category: TimeCategory;
  siteId?: string;
  jobCodeId?: string;
  assignedWorkerIds: string[];
  status: TimeShiftStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  /** When generated from a recurrence series. */
  seriesId?: string;
  /** ISO date (YYYY-MM-DD) for series occurrence dedup. */
  seriesOccurrenceDate?: string;
}

export interface ShiftListFilters {
  unionId: string;
  localId?: string;
  /** When set, only shifts that include this worker id. */
  workerId?: string;
  status?: TimeShiftStatus;
  from?: string;
  to?: string;
}

export interface CreateTimeShiftInput {
  label: string;
  startsAt: string;
  endsAt: string;
  category: TimeCategory;
  siteId?: string;
  jobCodeId?: string;
  assignedWorkerIds: string[];
  status?: Extract<TimeShiftStatus, "draft" | "published">;
}

export interface UpdateTimeShiftInput {
  label?: string;
  startsAt?: string;
  endsAt?: string;
  category?: TimeCategory;
  siteId?: string | null;
  jobCodeId?: string | null;
  assignedWorkerIds?: string[];
  status?: TimeShiftStatus;
}

/** Phase 8 full — standing named worker groups for bulk assign. */
export interface TimeWorkerGroup {
  id: string;
  unionId: string;
  localId: string;
  name: string;
  description?: string;
  memberWorkerIds: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertWorkerGroupInput {
  name: string;
  description?: string;
  memberWorkerIds?: string[];
  active?: boolean;
  id?: string;
}

/** Phase 8 full — OT policy engine (beyond 8d-lite weekly flag). */
export type PayPeriodType =
  | "weekly"
  | "biweekly"
  | "semi_monthly"
  | "custom_days";

export interface TimeOtPolicy {
  id: string;
  unionId: string;
  localId: string;
  name: string;
  payPeriodType: PayPeriodType;
  payPeriodDays?: number;
  /** Anchor date for biweekly alignment (YYYY-MM-DD). */
  payPeriodAnchor?: string;
  dailyRegularHours: number;
  dailyOtThreshold: number;
  weeklyRegularHours: number;
  dailyDoubleThreshold?: number;
  otMultiplier: number;
  doubleTimeMultiplier: number;
  holidayDates?: string[];
  holidayMultiplier: number;
  /** Categories that count toward OT totals (default: staff + release). */
  categoryOtEligible?: Partial<Record<TimeCategory, boolean>>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertOtPolicyInput {
  name: string;
  payPeriodType?: PayPeriodType;
  payPeriodDays?: number;
  payPeriodAnchor?: string;
  dailyRegularHours?: number;
  dailyOtThreshold?: number;
  weeklyRegularHours?: number;
  dailyDoubleThreshold?: number;
  otMultiplier?: number;
  doubleTimeMultiplier?: number;
  holidayDates?: string[];
  holidayMultiplier?: number;
  categoryOtEligible?: Partial<Record<TimeCategory, boolean>>;
  active?: boolean;
  id?: string;
}

export type OtFlagKind =
  | "none"
  | "daily_ot"
  | "weekly_ot"
  | "double"
  | "holiday";

export interface EntryOtBreakdown {
  entryId: string;
  regularHours: number;
  otHours: number;
  doubleHours: number;
  holidayHours: number;
  otFlag: OtFlagKind;
}

/** Phase 8 full — shift recurrence series. */
export type ShiftRecurrenceFrequency = "daily" | "weekly" | "biweekly";

export interface ShiftRecurrenceRule {
  frequency: ShiftRecurrenceFrequency;
  /** Every N periods (default 1). */
  interval?: number;
  /** 0=Sun … 6=Sat for weekly/biweekly. */
  weekdays?: number[];
  /** Series start date (YYYY-MM-DD). */
  startsOn: string;
  endsOn?: string;
  maxOccurrences?: number;
}

export interface TimeShiftSeries {
  id: string;
  unionId: string;
  localId: string;
  label: string;
  /** Wall-clock start time HH:mm (UTC fields). */
  startTime: string;
  durationMinutes: number;
  category: TimeCategory;
  siteId?: string;
  jobCodeId?: string;
  assignedWorkerIds: string[];
  recurrence: ShiftRecurrenceRule;
  status: TimeShiftStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftSeriesInput {
  label: string;
  startTime: string;
  durationMinutes: number;
  category: TimeCategory;
  siteId?: string;
  jobCodeId?: string;
  assignedWorkerIds: string[];
  recurrence: ShiftRecurrenceRule;
  status?: Extract<TimeShiftStatus, "draft" | "published">;
}

export interface UpdateShiftSeriesInput {
  label?: string;
  startTime?: string;
  durationMinutes?: number;
  category?: TimeCategory;
  siteId?: string | null;
  jobCodeId?: string | null;
  assignedWorkerIds?: string[];
  recurrence?: ShiftRecurrenceRule;
  status?: TimeShiftStatus;
}

/** Phase 8 full — auto-accrual formulas (beyond 8c.3 manual set/adjust). */
export type AccrualFormulaType =
  | "hours_worked"
  | "fixed_per_period"
  | "tenure_tier";

export interface AccrualTenureTier {
  minMonths: number;
  hoursPerPeriod: number;
}

export interface PtoAccrualPolicy {
  id: string;
  unionId: string;
  localId: string;
  name: string;
  ptoType: PtoType;
  formulaType: AccrualFormulaType;
  /** Hours accrued per hour worked (e.g. 0.0385). */
  hoursWorkedRate?: number;
  eligibleCategories?: TimeCategory[];
  fixedHoursPerPeriod?: number;
  periodDays?: number;
  tenureTiers?: AccrualTenureTier[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertAccrualPolicyInput {
  name: string;
  ptoType: PtoType;
  formulaType: AccrualFormulaType;
  hoursWorkedRate?: number;
  eligibleCategories?: TimeCategory[];
  fixedHoursPerPeriod?: number;
  periodDays?: number;
  tenureTiers?: AccrualTenureTier[];
  active?: boolean;
  id?: string;
}

export interface AccrualRunResult {
  policyId: string;
  workerId: string;
  ptoType: PtoType;
  hoursAccrued: number;
  balanceAfter: number;
}

/** Phase 8 full — payroll vendor export hooks (no live vendor API). */
export type PayrollVendor =
  | "generic_csv"
  | "adp_workforce"
  | "quickbooks"
  | "ceridian"
  | "custom";

export interface PayrollFieldMapping {
  workerName?: string;
  employeeNumber?: string;
  clockIn?: string;
  clockOut?: string;
  durationHours?: string;
  jobCode?: string;
  category?: string;
  regularHours?: string;
  otHours?: string;
  doubleHours?: string;
}

export interface PayrollExportProfile {
  id: string;
  unionId: string;
  localId: string;
  name: string;
  vendor: PayrollVendor;
  fieldMapping: PayrollFieldMapping;
  /** Optional webhook POST on export (operator-hosted). */
  webhookUrl?: string;
  includeOtBreakdown: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertPayrollProfileInput {
  name: string;
  vendor: PayrollVendor;
  fieldMapping?: PayrollFieldMapping;
  webhookUrl?: string;
  includeOtBreakdown?: boolean;
  active?: boolean;
  id?: string;
}
