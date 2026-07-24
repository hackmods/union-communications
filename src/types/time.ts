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

export interface TimeWorker {
  id: string;
  unionId: string;
  localId: string;
  displayName: string;
  userId?: string;
  trackGaps: boolean;
  active: boolean;
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

export interface UpsertWorkerInput {
  displayName: string;
  userId?: string;
  trackGaps?: boolean;
  active?: boolean;
  id?: string;
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
