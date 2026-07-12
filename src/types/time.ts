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
  clockInAt: string;
  clockOutAt?: string;
  notes?: string;
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

export interface TimeListFilters {
  unionId: string;
  localId?: string;
  workerId?: string;
  category?: TimeCategory;
  status?: TimeEntryStatus;
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
