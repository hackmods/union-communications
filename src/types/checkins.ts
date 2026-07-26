/** Basecamp-style automatic check-ins — recurring local questions. */

export type CheckinCadence = "daily" | "weekdays" | "weekly";

export interface CheckinSchedule {
  id: string;
  unionId: string;
  localId: string;
  bargainingUnitId?: string;
  question: string;
  cadence: CheckinCadence;
  /** 0–6 (Sun–Sat UTC). Required when cadence is `weekly`. */
  weekday?: number;
  active: boolean;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckinAnswer {
  id: string;
  scheduleId: string;
  unionId: string;
  localId: string;
  periodKey: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface CheckinListFilters {
  unionId: string;
  localId?: string;
  bargainingUnitId?: string;
  activeOnly?: boolean;
}

export interface CreateCheckinScheduleInput {
  question: string;
  cadence: CheckinCadence;
  weekday?: number;
  bargainingUnitId?: string;
}

export interface UpdateCheckinScheduleInput {
  question?: string;
  cadence?: CheckinCadence;
  weekday?: number | null;
  active?: boolean;
  bargainingUnitId?: string | null;
}

export interface CreateCheckinAnswerInput {
  body: string;
  /** Defaults to current period for the schedule. */
  periodKey?: string;
}

export interface CheckinPendingItem {
  schedule: CheckinSchedule;
  periodKey: string;
  periodLabel: string;
}

export interface CheckinPeriodInfo {
  periodKey: string;
  periodLabel: string;
}
