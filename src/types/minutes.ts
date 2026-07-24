/** ORG-001 — Meeting minutes with motions / votes */

export type MeetingType = "exec" | "general" | "committee";

export type MinutesStatus = "draft" | "approved";

export type MotionResult = "carried" | "defeated" | "tabled";

export interface MotionVote {
  for: number;
  against: number;
  abstain: number;
}

export interface Motion {
  text: string;
  movedBy: string;
  secondedBy: string;
  vote: MotionVote;
  result: MotionResult;
}

export interface MeetingMinutes {
  id: string;
  unionId: string;
  localId: string;
  meetingDate: string;
  meetingType: MeetingType;
  attendees: string[];
  motions: Motion[];
  notes: string;
  recordedById: string;
  recordedByName: string;
  status: MinutesStatus;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingMinutesInput {
  meetingDate: string;
  meetingType: MeetingType;
  attendees: string[];
  motions: Motion[];
  notes: string;
}

export interface UpdateMeetingMinutesInput {
  meetingDate?: string;
  meetingType?: MeetingType;
  attendees?: string[];
  motions?: Motion[];
  notes?: string;
}

export interface MeetingMinutesListFilters {
  unionId: string;
  localId?: string;
  status?: MinutesStatus;
  meetingType?: MeetingType;
}
