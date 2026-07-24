import type { MinutesAdapter } from "./adapter";
import type {
  CreateMeetingMinutesInput,
  MeetingMinutes,
  MeetingMinutesListFilters,
  UpdateMeetingMinutesInput,
} from "@/types/minutes";

const minutes: MeetingMinutes[] = [
  {
    id: "minutes-001",
    unionId: "union-opseu",
    localId: "local-243",
    meetingDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    meetingType: "exec",
    attendees: ["President", "Vice-President", "Chief Steward", "Treasurer"],
    motions: [
      {
        text: "That the Local endorse the solidarity raffle for Local 110.",
        movedBy: "Vice-President",
        secondedBy: "Chief Steward",
        vote: { for: 4, against: 0, abstain: 0 },
        result: "carried",
      },
    ],
    notes: "Treasurer reported bank balance. Next membership meeting set for September.",
    recordedById: "user-president-243",
    recordedByName: "Local 243 President",
    status: "draft",
    createdAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class MemoryMinutesAdapter implements MinutesAdapter {
  async list(filters: MeetingMinutesListFilters): Promise<MeetingMinutes[]> {
    let results = minutes.filter((m) => m.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter((m) => m.localId === filters.localId);
    }
    if (filters.status) {
      results = results.filter((m) => m.status === filters.status);
    }
    if (filters.meetingType) {
      results = results.filter((m) => m.meetingType === filters.meetingType);
    }
    return results.sort(
      (a, b) =>
        new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime(),
    );
  }

  async getById(minutesId: string): Promise<MeetingMinutes | null> {
    return minutes.find((m) => m.id === minutesId) ?? null;
  }

  async create(
    input: CreateMeetingMinutesInput,
    meta: {
      unionId: string;
      localId: string;
      recordedById: string;
      recordedByName: string;
    },
  ): Promise<MeetingMinutes> {
    const now = new Date().toISOString();
    const entry: MeetingMinutes = {
      id: id("minutes"),
      unionId: meta.unionId,
      localId: meta.localId,
      meetingDate: input.meetingDate,
      meetingType: input.meetingType,
      attendees: [...input.attendees],
      motions: input.motions.map((m) => ({
        text: m.text,
        movedBy: m.movedBy,
        secondedBy: m.secondedBy,
        vote: { ...m.vote },
        result: m.result,
      })),
      notes: input.notes,
      recordedById: meta.recordedById,
      recordedByName: meta.recordedByName,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    minutes.push(entry);
    return entry;
  }

  async update(
    minutesId: string,
    input: UpdateMeetingMinutesInput,
  ): Promise<MeetingMinutes | null> {
    const idx = minutes.findIndex((m) => m.id === minutesId);
    if (idx < 0) return null;
    const existing = minutes[idx];
    if (existing.status === "approved") return null;

    const next: MeetingMinutes = { ...existing };
    if (input.meetingDate !== undefined) next.meetingDate = input.meetingDate;
    if (input.meetingType !== undefined) next.meetingType = input.meetingType;
    if (input.attendees !== undefined) next.attendees = [...input.attendees];
    if (input.motions !== undefined) {
      next.motions = input.motions.map((m) => ({
        text: m.text,
        movedBy: m.movedBy,
        secondedBy: m.secondedBy,
        vote: { ...m.vote },
        result: m.result,
      }));
    }
    if (input.notes !== undefined) next.notes = input.notes;
    next.updatedAt = new Date().toISOString();
    minutes[idx] = next;
    return next;
  }

  async approve(minutesId: string): Promise<MeetingMinutes | null> {
    const idx = minutes.findIndex((m) => m.id === minutesId);
    if (idx < 0) return null;
    const existing = minutes[idx];
    if (existing.status === "approved") return existing;
    const now = new Date().toISOString();
    const next: MeetingMinutes = {
      ...existing,
      status: "approved",
      approvedAt: now,
      updatedAt: now,
    };
    minutes[idx] = next;
    return next;
  }

  async remove(minutesId: string): Promise<boolean> {
    const idx = minutes.findIndex((m) => m.id === minutesId);
    if (idx < 0) return false;
    minutes.splice(idx, 1);
    return true;
  }
}

export const memoryMinutesStore: MinutesAdapter = new MemoryMinutesAdapter();
