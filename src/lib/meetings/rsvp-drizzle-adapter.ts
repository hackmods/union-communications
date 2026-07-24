import { and, desc, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db/client";
import {
  rsvpResponses,
  rsvpTokens,
  unionMeetings,
} from "@/lib/db/schema/meetings-rsvp";
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

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function opaqueToken(): string {
  return randomBytes(24).toString("base64url");
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapMeeting(row: typeof unionMeetings.$inferSelect): UnionMeeting {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    bargainingUnitId: row.bargainingUnitId ?? undefined,
    title: row.title,
    startsAt: toIso(row.startsAt),
    endsAt: toIso(row.endsAt),
    location: row.location,
    publicBlurb: row.publicBlurb ?? undefined,
    quorumNeeded: row.quorumNeeded ?? undefined,
    hybrid: row.hybrid === "true",
    createdById: row.createdById,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapToken(row: typeof rsvpTokens.$inferSelect): RsvpToken {
  return {
    id: row.id,
    meetingId: row.meetingId,
    token: row.token,
    expiresAt: row.expiresAt ? toIso(row.expiresAt) : undefined,
    revokedAt: row.revokedAt ? toIso(row.revokedAt) : undefined,
    createdById: row.createdById,
    createdAt: toIso(row.createdAt),
  };
}

function mapResponse(row: typeof rsvpResponses.$inferSelect): RsvpResponse {
  return {
    id: row.id,
    meetingId: row.meetingId,
    unionId: row.unionId,
    localId: row.localId,
    attending: row.attending,
    joinMode: row.joinMode ?? undefined,
    displayName: row.displayName,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    guestsOnSite: row.guestsOnSite ?? undefined,
    dietaryNote: row.dietaryNote ?? undefined,
    accessibilityNote: row.accessibilityNote ?? undefined,
    roleOrOffice: row.roleOrOffice ?? undefined,
    source: row.source,
    consentAcceptedAt: row.consentAcceptedAt
      ? toIso(row.consentAcceptedAt)
      : undefined,
    createdAt: toIso(row.createdAt),
    ipHash: row.ipHash ?? undefined,
  };
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

export class DrizzleMeetingsRsvpAdapter implements MeetingsRsvpAdapter {
  async listMeetings(
    filters: UnionMeetingListFilters,
  ): Promise<UnionMeeting[]> {
    const db = getDb();
    const conditions = [eq(unionMeetings.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(unionMeetings.localId, filters.localId));
    }
    const rows = await db
      .select()
      .from(unionMeetings)
      .where(and(...conditions))
      .orderBy(unionMeetings.startsAt);
    return rows.map(mapMeeting);
  }

  async getMeetingById(meetingId: string): Promise<UnionMeeting | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(unionMeetings)
      .where(eq(unionMeetings.id, meetingId))
      .limit(1);
    return rows[0] ? mapMeeting(rows[0]) : null;
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
    const db = getDb();
    const [row] = await db
      .insert(unionMeetings)
      .values({
        id: newId("umeet"),
        unionId: meta.unionId,
        localId: meta.localId,
        bargainingUnitId:
          meta.bargainingUnitId ?? input.bargainingUnitId ?? null,
        title: input.title.trim(),
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        location: input.location.trim(),
        publicBlurb: input.publicBlurb?.trim() || null,
        quorumNeeded: input.quorumNeeded ?? null,
        hybrid: input.hybrid === false ? "false" : "true",
        createdById: meta.createdById,
      })
      .returning();
    return mapMeeting(row);
  }

  async updateMeeting(
    meetingId: string,
    input: UpdateUnionMeetingInput,
  ): Promise<UnionMeeting | null> {
    const existing = await this.getMeetingById(meetingId);
    if (!existing) return null;
    const db = getDb();
    const patch: Partial<typeof unionMeetings.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.startsAt !== undefined) patch.startsAt = new Date(input.startsAt);
    if (input.endsAt !== undefined) patch.endsAt = new Date(input.endsAt);
    if (input.location !== undefined) patch.location = input.location.trim();
    if (input.publicBlurb !== undefined) {
      patch.publicBlurb =
        input.publicBlurb === null || input.publicBlurb.trim() === ""
          ? null
          : input.publicBlurb.trim();
    }
    if (input.quorumNeeded !== undefined) {
      patch.quorumNeeded = input.quorumNeeded;
    }
    if (input.hybrid !== undefined) {
      patch.hybrid = input.hybrid ? "true" : "false";
    }
    if (input.bargainingUnitId !== undefined) {
      patch.bargainingUnitId =
        input.bargainingUnitId === null || input.bargainingUnitId.trim() === ""
          ? null
          : input.bargainingUnitId.trim();
    }
    const [row] = await db
      .update(unionMeetings)
      .set(patch)
      .where(eq(unionMeetings.id, meetingId))
      .returning();
    return row ? mapMeeting(row) : null;
  }

  async deleteMeeting(meetingId: string): Promise<boolean> {
    const db = getDb();
    const deleted = await db
      .delete(unionMeetings)
      .where(eq(unionMeetings.id, meetingId))
      .returning({ id: unionMeetings.id });
    return deleted.length > 0;
  }

  async listTokens(meetingId: string): Promise<RsvpToken[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(rsvpTokens)
      .where(eq(rsvpTokens.meetingId, meetingId))
      .orderBy(desc(rsvpTokens.createdAt));
    return rows.map(mapToken);
  }

  async createToken(
    meetingId: string,
    meta: { createdById: string; expiresAt?: string },
  ): Promise<RsvpToken | null> {
    const meeting = await this.getMeetingById(meetingId);
    if (!meeting) return null;
    const db = getDb();
    const [row] = await db
      .insert(rsvpTokens)
      .values({
        id: newId("rsvpt"),
        meetingId,
        token: opaqueToken(),
        expiresAt: meta.expiresAt ? new Date(meta.expiresAt) : null,
        createdById: meta.createdById,
      })
      .returning();
    return mapToken(row);
  }

  async revokeToken(tokenId: string): Promise<RsvpToken | null> {
    const db = getDb();
    const existing = await db
      .select()
      .from(rsvpTokens)
      .where(eq(rsvpTokens.id, tokenId))
      .limit(1);
    if (!existing[0]) return null;
    if (existing[0].revokedAt) return mapToken(existing[0]);
    const [row] = await db
      .update(rsvpTokens)
      .set({ revokedAt: new Date() })
      .where(eq(rsvpTokens.id, tokenId))
      .returning();
    return row ? mapToken(row) : null;
  }

  async getTokenByValue(tokenValue: string): Promise<RsvpToken | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(rsvpTokens)
      .where(eq(rsvpTokens.token, tokenValue.trim()))
      .limit(1);
    return rows[0] ? mapToken(rows[0]) : null;
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
    const db = getDb();
    const rows = await db
      .select()
      .from(rsvpResponses)
      .where(eq(rsvpResponses.meetingId, meetingId))
      .orderBy(desc(rsvpResponses.createdAt));
    return rows.map(mapResponse);
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

    const db = getDb();
    const consentAt =
      meta.source === "public_form" || normalized.data.consentAccepted
        ? new Date()
        : null;
    const [row] = await db
      .insert(rsvpResponses)
      .values({
        id: newId("rsvpr"),
        meetingId,
        unionId: meeting.unionId,
        localId: meeting.localId,
        attending: normalized.data.attending,
        joinMode: normalized.data.joinMode ?? null,
        displayName: normalized.data.displayName,
        email: normalized.data.email ?? null,
        phone: normalized.data.phone ?? null,
        guestsOnSite: normalized.data.guestsOnSite ?? null,
        dietaryNote: normalized.data.dietaryNote ?? null,
        accessibilityNote: normalized.data.accessibilityNote ?? null,
        roleOrOffice: normalized.data.roleOrOffice ?? null,
        source: meta.source,
        consentAcceptedAt: consentAt,
        ipHash: meta.ipHash ?? null,
      })
      .returning();
    return { response: mapResponse(row) };
  }

  async tallies(meetingId: string): Promise<MeetingRsvpTallies | null> {
    const meeting = await this.getMeetingById(meetingId);
    if (!meeting) return null;
    const rows = await this.listResponses(meetingId);
    return computeRsvpTallies(rows, meeting.quorumNeeded);
  }
}
