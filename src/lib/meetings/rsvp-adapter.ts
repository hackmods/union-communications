import type {
  CreateUnionMeetingInput,
  MeetingRsvpTallies,
  PublicRsvpMeeting,
  RsvpResponse,
  RsvpToken,
  SubmitRsvpInput,
  UnionMeeting,
  UnionMeetingListFilters,
  UpdateUnionMeetingInput,
} from "@/types/meetings";

export interface MeetingsRsvpAdapter {
  listMeetings(filters: UnionMeetingListFilters): Promise<UnionMeeting[]>;
  getMeetingById(id: string): Promise<UnionMeeting | null>;
  createMeeting(
    input: CreateUnionMeetingInput,
    meta: {
      unionId: string;
      localId: string;
      createdById: string;
      bargainingUnitId?: string;
    },
  ): Promise<UnionMeeting>;
  updateMeeting(
    id: string,
    input: UpdateUnionMeetingInput,
  ): Promise<UnionMeeting | null>;
  deleteMeeting(id: string): Promise<boolean>;

  listTokens(meetingId: string): Promise<RsvpToken[]>;
  createToken(
    meetingId: string,
    meta: { createdById: string; expiresAt?: string },
  ): Promise<RsvpToken | null>;
  revokeToken(tokenId: string): Promise<RsvpToken | null>;
  getTokenByValue(token: string): Promise<RsvpToken | null>;

  /** Resolves a share token to public-safe meeting fields (or null if unknown). */
  resolvePublicToken(
    token: string,
  ): Promise<{ meeting: PublicRsvpMeeting; tokenRow: RsvpToken } | null>;

  listResponses(meetingId: string): Promise<RsvpResponse[]>;
  submitResponse(
    meetingId: string,
    input: SubmitRsvpInput,
    meta: {
      source: "public_form" | "officer_entry";
      ipHash?: string;
    },
  ): Promise<{ response?: RsvpResponse; error?: string }>;

  tallies(meetingId: string): Promise<MeetingRsvpTallies | null>;
}
