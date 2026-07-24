import { getTenantByUnionId } from "@/lib/tenant/loader";
import type { MeetingsAdapter } from "./adapter";
import type {
  LocalMeetingSchedule,
  UpsertMeetingScheduleInput,
} from "@/types/meetings";

const schedules: LocalMeetingSchedule[] = [];

function id(): string {
  return `mtgsched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Deterministic public slug — one schedule per local, no collision handling needed. */
export function buildPublicSlug(unionId: string, localId: string): string {
  const unionSlug = getTenantByUnionId(unionId)?.union.slug ?? unionId;
  const raw = `${unionSlug}-${localId}`;
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export class MemoryMeetingsAdapter implements MeetingsAdapter {
  async getForLocal(
    unionId: string,
    localId: string,
  ): Promise<LocalMeetingSchedule | null> {
    return (
      schedules.find((s) => s.unionId === unionId && s.localId === localId) ??
      null
    );
  }

  async getBySlug(slug: string): Promise<LocalMeetingSchedule | null> {
    const normalized = slug.trim().toLowerCase();
    return schedules.find((s) => s.publicSlug === normalized) ?? null;
  }

  async upsertForLocal(
    unionId: string,
    localId: string,
    input: UpsertMeetingScheduleInput,
    meta: { updatedById: string },
  ): Promise<LocalMeetingSchedule> {
    const now = new Date().toISOString();
    const idx = schedules.findIndex(
      (s) => s.unionId === unionId && s.localId === localId,
    );
    const next: LocalMeetingSchedule = {
      id: idx >= 0 ? schedules[idx].id : id(),
      unionId,
      localId,
      recurrence: input.recurrence,
      dayOfMonth: input.dayOfMonth,
      weekday: input.weekday,
      nthWeekOfMonth: input.nthWeekOfMonth,
      customDates: input.customDates,
      time: input.time,
      durationMinutes: input.durationMinutes ?? 90,
      location: input.location,
      publicBlurb: input.publicBlurb,
      timezone: input.timezone,
      publicSlug: buildPublicSlug(unionId, localId),
      updatedById: meta.updatedById,
      createdAt: idx >= 0 ? schedules[idx].createdAt : now,
      updatedAt: now,
    };
    if (idx >= 0) {
      schedules[idx] = next;
    } else {
      schedules.push(next);
    }
    return next;
  }
}

export const memoryMeetingsStore: MeetingsAdapter = new MemoryMeetingsAdapter();

/** @internal test helper */
export function resetMemoryMeetingsStore(): void {
  schedules.length = 0;
}
