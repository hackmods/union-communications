import type {
  CheckinAnswer,
  CheckinListFilters,
  CheckinSchedule,
  CreateCheckinAnswerInput,
  CreateCheckinScheduleInput,
  UpdateCheckinScheduleInput,
} from "@/types/checkins";

export interface CheckinsAdapter {
  listSchedules(filters: CheckinListFilters): Promise<CheckinSchedule[]>;
  getSchedule(id: string): Promise<CheckinSchedule | null>;
  createSchedule(
    input: CreateCheckinScheduleInput,
    meta: {
      unionId: string;
      localId: string;
      createdById: string;
      createdByName: string;
    },
  ): Promise<CheckinSchedule>;
  updateSchedule(
    id: string,
    input: UpdateCheckinScheduleInput,
  ): Promise<CheckinSchedule | null>;
  listAnswers(
    scheduleId: string,
    periodKey: string,
  ): Promise<CheckinAnswer[]>;
  getAnswer(
    scheduleId: string,
    periodKey: string,
    authorId: string,
  ): Promise<CheckinAnswer | null>;
  createAnswer(
    scheduleId: string,
    input: CreateCheckinAnswerInput & { periodKey: string },
    meta: {
      unionId: string;
      localId: string;
      authorId: string;
      authorName: string;
    },
  ): Promise<CheckinAnswer | null>;
}
