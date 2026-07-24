import type {
  CreateMeetingMinutesInput,
  MeetingMinutes,
  MeetingMinutesListFilters,
  UpdateMeetingMinutesInput,
} from "@/types/minutes";

export interface MinutesAdapter {
  list(filters: MeetingMinutesListFilters): Promise<MeetingMinutes[]>;
  getById(id: string): Promise<MeetingMinutes | null>;
  create(
    input: CreateMeetingMinutesInput,
    meta: {
      unionId: string;
      localId: string;
      recordedById: string;
      recordedByName: string;
    },
  ): Promise<MeetingMinutes>;
  update(
    id: string,
    input: UpdateMeetingMinutesInput,
  ): Promise<MeetingMinutes | null>;
  approve(id: string): Promise<MeetingMinutes | null>;
  remove(id: string): Promise<boolean>;
}
