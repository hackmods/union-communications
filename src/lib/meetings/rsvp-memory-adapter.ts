import { randomBytes } from "node:crypto";
import type { MeetingsRsvpAdapter } from "./rsvp-adapter";
import { computeRsvpTallies } from "./tallies";
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

const now = () => new Date().toISOString();

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function opaqueToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Survive Next.js dual module graphs (Route Handler vs RSC) in `next dev`. */
type RsvpMemoryBucket = {
  meetings: UnionMeeting[];
  tokens: RsvpToken[];
  responses: RsvpResponse[];
};

const g = globalThis as typeof globalThis & {
  __unionopsMeetingsRsvpMemory?: RsvpMemoryBucket;
};

function bucket(): RsvpMemoryBucket {
  if (!g.__unionopsMeetingsRsvpMemory) {
    g.__unionopsMeetingsRsvpMemory = {
      meetings: [],
      tokens: [],
      responses: [],
    };
  }
  return g.__unionopsMeetingsRsvpMemory;
}

function toPublicMeeting(
  meeting: UnionMeeting,
  tokenRow: RsvpToken,
): PublicRsvpMeeting {
  return {
    title: meeting.title,
    startsAt: meeting.startsAt,
    endsAt: meeting.endsAt,
    location: meeting.location,
    publicBlurb: meeting.publicBlurb,
    hybrid: meeting.hybrid,
    tokenExpired: Boolean(
      tokenRow.expiresAt &&
        new Date(tokenRow.expiresAt).getTime() <= Date.now(),
    ),
    tokenRevoked: Boolean(tokenRow.revokedAt),
  };
}

function normalizeSubmit(
  input: SubmitRsvpInput,
): { ok: true; data: SubmitRsvpInput } | { ok: false; error: string } {
  const attending = input.attending;
  const joinMode = attending === "no" ? undefined : input.joinMode;
  if ((attending === "yes" || attending === "maybe") && !joinMode) {
    return { ok: false, error: "joinMode required when attending yes/maybe" };
  }
  const displayName = input.displayName.trim();
  if (!displayName) return { ok: false, error: "displayName required" };
  return {
    ok: true,
    data: {
      attending,
      joinMode,
      displayName,
      email: input.email?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      guestsOnSite:
        joinMode === "on_site" ? Math.max(0, input.guestsOnSite ?? 0) : undefined,
      dietaryNote: input.dietaryNote?.trim() || undefined,
      accessibilityNote: input.accessibilityNote?.trim() || undefined,
      roleOrOffice: input.roleOrOffice?.trim() || undefined,
      consentAccepted: input.consentAccepted,
    },
  };
}

export class MemoryMeetingsRsvpAdapter implements MeetingsRsvpAdapter {
  async listMeetings(
    filters: UnionMeetingListFilters,
  ): Promise<UnionMeeting[]> {
    let results = bucket().meetings.filter((m) => m.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter((m) => m.localId === filters.localId);
    }
    return [...results].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  async getMeetingById(meetingId: string): Promise<UnionMeeting | null> {
    return bucket().meetings.find((m) => m.id === meetingId) ?? null;
  }

  async createMeeting(
    input: CreateUnionMeetingInput,
    meta: {
      unionId: string;
      localId: string;
      createdById: string;
      bargainingUnitId?: string;
    },
  ): Promise<UnionMeeting> {
    const ts = now();
    const meeting: UnionMeeting = {
      id: id("umeet"),
      unionId: meta.unionId,
      localId: meta.localId,
      bargainingUnitId: meta.bargainingUnitId ?? input.bargainingUnitId,
      title: input.title.trim(),
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location.trim(),
      publicBlurb: input.publicBlurb?.trim() || undefined,
      quorumNeeded: input.quorumNeeded,
      hybrid: input.hybrid ?? true,
      createdById: meta.createdById,
      createdAt: ts,
      updatedAt: ts,
    };
    bucket().meetings.push(meeting);
    return meeting;
  }

  async updateMeeting(
    meetingId: string,
    input: UpdateUnionMeetingInput,
  ): Promise<UnionMeeting | null> {
    const meetings = bucket().meetings;
    const idx = meetings.findIndex((m) => m.id === meetingId);
    if (idx < 0) return null;
    const existing = meetings[idx];
    const next: UnionMeeting = { ...existing, updatedAt: now() };
    if (input.title !== undefined) next.title = input.title.trim();
    if (input.startsAt !== undefined) next.startsAt = input.startsAt;
    if (input.endsAt !== undefined) next.endsAt = input.endsAt;
    if (input.location !== undefined) next.location = input.location.trim();
    if (input.publicBlurb !== undefined) {
      next.publicBlurb =
        input.publicBlurb === null || input.publicBlurb.trim() === ""
          ? undefined
          : input.publicBlurb.trim();
    }
    if (input.quorumNeeded !== undefined) {
      next.quorumNeeded =
        input.quorumNeeded === null ? undefined : input.quorumNeeded;
    }
    if (input.hybrid !== undefined) next.hybrid = input.hybrid;
    if (input.bargainingUnitId !== undefined) {
      next.bargainingUnitId =
        input.bargainingUnitId === null || input.bargainingUnitId.trim() === ""
          ? undefined
          : input.bargainingUnitId.trim();
    }
    meetings[idx] = next;
    return next;
  }

  async deleteMeeting(meetingId: string): Promise<boolean> {
    const { meetings, tokens, responses } = bucket();
    const idx = meetings.findIndex((m) => m.id === meetingId);
    if (idx < 0) return false;
    meetings.splice(idx, 1);
    for (let i = tokens.length - 1; i >= 0; i -= 1) {
      if (tokens[i].meetingId === meetingId) tokens.splice(i, 1);
    }
    for (let i = responses.length - 1; i >= 0; i -= 1) {
      if (responses[i].meetingId === meetingId) responses.splice(i, 1);
    }
    return true;
  }

  async listTokens(meetingId: string): Promise<RsvpToken[]> {
    return bucket()
      .tokens.filter((t) => t.meetingId === meetingId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createToken(
    meetingId: string,
    meta: { createdById: string; expiresAt?: string },
  ): Promise<RsvpToken | null> {
    const meeting = await this.getMeetingById(meetingId);
    if (!meeting) return null;
    const row: RsvpToken = {
      id: id("rsvpt"),
      meetingId,
      token: opaqueToken(),
      expiresAt: meta.expiresAt,
      createdById: meta.createdById,
      createdAt: now(),
    };
    bucket().tokens.push(row);
    return row;
  }

  async revokeToken(tokenId: string): Promise<RsvpToken | null> {
    const tokens = bucket().tokens;
    const idx = tokens.findIndex((t) => t.id === tokenId);
    if (idx < 0) return null;
    const next: RsvpToken = {
      ...tokens[idx],
      revokedAt: tokens[idx].revokedAt ?? now(),
    };
    tokens[idx] = next;
    return next;
  }

  async getTokenByValue(tokenValue: string): Promise<RsvpToken | null> {
    const normalized = tokenValue.trim();
    return bucket().tokens.find((t) => t.token === normalized) ?? null;
  }

  async resolvePublicToken(
    tokenValue: string,
  ): Promise<{ meeting: PublicRsvpMeeting; tokenRow: RsvpToken } | null> {
    const tokenRow = await this.getTokenByValue(tokenValue);
    if (!tokenRow) return null;
    const meeting = await this.getMeetingById(tokenRow.meetingId);
    if (!meeting) return null;
    return { meeting: toPublicMeeting(meeting, tokenRow), tokenRow };
  }

  async listResponses(meetingId: string): Promise<RsvpResponse[]> {
    return bucket()
      .responses.filter((r) => r.meetingId === meetingId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async submitResponse(
    meetingId: string,
    input: SubmitRsvpInput,
    meta: {
      source: "public_form" | "officer_entry";
      ipHash?: string;
    },
  ): Promise<{ response?: RsvpResponse; error?: string }> {
    const meeting = await this.getMeetingById(meetingId);
    if (!meeting) return { error: "Meeting not found" };

    const normalized = normalizeSubmit(input);
    if (!normalized.ok) return { error: normalized.error };

    if (meta.source === "public_form" && !normalized.data.consentAccepted) {
      return { error: "Consent required" };
    }

    const response: RsvpResponse = {
      id: id("rsvpr"),
      meetingId,
      unionId: meeting.unionId,
      localId: meeting.localId,
      attending: normalized.data.attending,
      joinMode: normalized.data.joinMode,
      displayName: normalized.data.displayName,
      email: normalized.data.email,
      phone: normalized.data.phone,
      guestsOnSite: normalized.data.guestsOnSite,
      dietaryNote: normalized.data.dietaryNote,
      accessibilityNote: normalized.data.accessibilityNote,
      roleOrOffice: normalized.data.roleOrOffice,
      source: meta.source,
      consentAcceptedAt:
        meta.source === "public_form" || normalized.data.consentAccepted
          ? now()
          : undefined,
      createdAt: now(),
      ipHash: meta.ipHash,
    };
    bucket().responses.push(response);
    return { response };
  }

  async tallies(meetingId: string): Promise<MeetingRsvpTallies | null> {
    const meeting = await this.getMeetingById(meetingId);
    if (!meeting) return null;
    const rows = await this.listResponses(meetingId);
    return computeRsvpTallies(rows, meeting.quorumNeeded);
  }
}

export const memoryMeetingsRsvpStore: MeetingsRsvpAdapter =
  new MemoryMeetingsRsvpAdapter();

/** @internal test helper */
export function resetMemoryMeetingsRsvpStore(): void {
  const b = bucket();
  b.meetings.length = 0;
  b.tokens.length = 0;
  b.responses.length = 0;
}
