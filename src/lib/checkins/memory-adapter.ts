import type { CheckinsAdapter } from "./adapter";
import type {
  CheckinAnswer,
  CheckinListFilters,
  CheckinSchedule,
  CreateCheckinAnswerInput,
  CreateCheckinScheduleInput,
  UpdateCheckinScheduleInput,
} from "@/types/checkins";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const now = () => new Date().toISOString();

const schedules: CheckinSchedule[] = [
  {
    id: "checkin-sched-001",
    unionId: "union-opseu",
    localId: "local-243",
    bargainingUnitId: "bu-243-ft",
    question: "What are you working on for the local this week?",
    cadence: "weekly",
    weekday: 1,
    active: true,
    createdById: "user-president-243",
    createdByName: "Local 243 President",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "checkin-sched-002",
    unionId: "union-opseu",
    localId: "local-243",
    bargainingUnitId: "bu-243-ft",
    question: "Any member issues or board questions that need a follow-up today?",
    cadence: "weekdays",
    active: true,
    createdById: "user-president-243",
    createdByName: "Local 243 President",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "checkin-sched-003",
    unionId: "union-opseu",
    localId: "local-243",
    bargainingUnitId: "bu-243-pt",
    question:
      "Were any part-time members skipped on this week's additional-hours list?",
    cadence: "weekly",
    weekday: 3,
    active: true,
    createdById: "user-president-243",
    createdByName: "Local 243 President",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const answers: CheckinAnswer[] = [];

export class MemoryCheckinsAdapter implements CheckinsAdapter {
  async listSchedules(
    filters: CheckinListFilters,
  ): Promise<CheckinSchedule[]> {
    let results = schedules.filter((s) => s.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter((s) => s.localId === filters.localId);
    }
    if (filters.bargainingUnitId) {
      results = results.filter(
        (s) => s.bargainingUnitId === filters.bargainingUnitId,
      );
    }
    if (filters.activeOnly) {
      results = results.filter((s) => s.active);
    }
    return results.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async getSchedule(id: string): Promise<CheckinSchedule | null> {
    return schedules.find((s) => s.id === id) ?? null;
  }

  async createSchedule(
    input: CreateCheckinScheduleInput,
    meta: {
      unionId: string;
      localId: string;
      createdById: string;
      createdByName: string;
    },
  ): Promise<CheckinSchedule> {
    const ts = now();
    const schedule: CheckinSchedule = {
      id: newId("checkin-sched"),
      unionId: meta.unionId,
      localId: meta.localId,
      bargainingUnitId: input.bargainingUnitId,
      question: input.question,
      cadence: input.cadence,
      weekday: input.cadence === "weekly" ? input.weekday : undefined,
      active: true,
      createdById: meta.createdById,
      createdByName: meta.createdByName,
      createdAt: ts,
      updatedAt: ts,
    };
    schedules.push(schedule);
    return schedule;
  }

  async updateSchedule(
    id: string,
    input: UpdateCheckinScheduleInput,
  ): Promise<CheckinSchedule | null> {
    const schedule = schedules.find((s) => s.id === id);
    if (!schedule) return null;

    if (input.question !== undefined) schedule.question = input.question;
    if (input.cadence !== undefined) schedule.cadence = input.cadence;
    if (input.weekday !== undefined) {
      schedule.weekday =
        input.weekday === null ? undefined : input.weekday;
    }
    if (input.active !== undefined) schedule.active = input.active;
    if (input.bargainingUnitId !== undefined) {
      schedule.bargainingUnitId =
        input.bargainingUnitId === null
          ? undefined
          : input.bargainingUnitId;
    }
    if (schedule.cadence !== "weekly") {
      schedule.weekday = undefined;
    }
    schedule.updatedAt = now();
    return schedule;
  }

  async listAnswers(
    scheduleId: string,
    periodKey: string,
  ): Promise<CheckinAnswer[]> {
    return answers
      .filter((a) => a.scheduleId === scheduleId && a.periodKey === periodKey)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }

  async getAnswer(
    scheduleId: string,
    periodKey: string,
    authorId: string,
  ): Promise<CheckinAnswer | null> {
    return (
      answers.find(
        (a) =>
          a.scheduleId === scheduleId &&
          a.periodKey === periodKey &&
          a.authorId === authorId,
      ) ?? null
    );
  }

  async createAnswer(
    scheduleId: string,
    input: CreateCheckinAnswerInput & { periodKey: string },
    meta: {
      unionId: string;
      localId: string;
      authorId: string;
      authorName: string;
    },
  ): Promise<CheckinAnswer | null> {
    const schedule = await this.getSchedule(scheduleId);
    if (!schedule) return null;

    const existing = await this.getAnswer(
      scheduleId,
      input.periodKey,
      meta.authorId,
    );
    if (existing) return null;

    const answer: CheckinAnswer = {
      id: newId("checkin-ans"),
      scheduleId,
      unionId: meta.unionId,
      localId: meta.localId,
      periodKey: input.periodKey,
      authorId: meta.authorId,
      authorName: meta.authorName,
      body: input.body,
      createdAt: now(),
    };
    answers.push(answer);
    return answer;
  }
}

export const memoryCheckinsStore = new MemoryCheckinsAdapter();
