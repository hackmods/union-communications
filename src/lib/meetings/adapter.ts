import type {
  LocalMeetingSchedule,
  UpsertMeetingScheduleInput,
} from "@/types/meetings";

export interface MeetingsAdapter {
  getForLocal(
    unionId: string,
    localId: string,
  ): Promise<LocalMeetingSchedule | null>;
  getBySlug(slug: string): Promise<LocalMeetingSchedule | null>;
  upsertForLocal(
    unionId: string,
    localId: string,
    input: UpsertMeetingScheduleInput,
    meta: { updatedById: string },
  ): Promise<LocalMeetingSchedule>;
}
