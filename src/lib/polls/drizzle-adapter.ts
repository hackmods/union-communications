import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { pollDefinitions, pollResponses } from "@/lib/db/schema/polls";
import type { PollsAdapter } from "./adapter";
import type {
  CreatePollInput,
  PollAggregates,
  PollDefinition,
  PollListFilters,
  PollQuestionAggregate,
  PollResponse,
  SubmitPollResponseInput,
  UpdatePollInput,
} from "@/types/polls";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapPoll(row: typeof pollDefinitions.$inferSelect): PollDefinition {
  return {
    id: row.id,
    slug: row.slug,
    unionId: row.unionId,
    localId: row.localId,
    title: row.title,
    intro: row.intro ?? undefined,
    questions: row.questions ?? [],
    createdById: row.createdById,
    status: row.status,
    consentRequired: row.consentRequired === "true",
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapResponse(row: typeof pollResponses.$inferSelect): PollResponse {
  return {
    id: row.id,
    pollId: row.pollId,
    answers: row.answers ?? {},
    submittedAt: toIso(row.submittedAt),
    consentAcceptedAt: toIso(row.consentAcceptedAt),
    ipHash: row.ipHash ?? undefined,
  };
}

function buildAggregates(
  poll: PollDefinition,
  rows: PollResponse[],
): PollAggregates {
  const questions: PollQuestionAggregate[] = poll.questions.map((q) => {
    if (q.type === "single_choice") {
      const optionCounts: Record<string, number> = {};
      for (const opt of q.options ?? []) {
        optionCounts[opt] = 0;
      }
      for (const row of rows) {
        const answer = row.answers[q.id]?.trim();
        if (!answer) continue;
        optionCounts[answer] = (optionCounts[answer] ?? 0) + 1;
      }
      return {
        questionId: q.id,
        text: q.text,
        type: q.type,
        optionCounts,
      };
    }
    const freeText: string[] = [];
    for (const row of rows) {
      const answer = row.answers[q.id]?.trim();
      if (answer) freeText.push(answer);
    }
    return {
      questionId: q.id,
      text: q.text,
      type: q.type,
      freeText,
    };
  });
  return {
    pollId: poll.id,
    responseCount: rows.length,
    questions,
  };
}

export class DrizzlePollsAdapter implements PollsAdapter {
  async list(filters: PollListFilters): Promise<PollDefinition[]> {
    const db = getDb();
    const conditions = [eq(pollDefinitions.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(pollDefinitions.localId, filters.localId));
    }
    if (filters.status) {
      conditions.push(eq(pollDefinitions.status, filters.status));
    }
    const rows = await db
      .select()
      .from(pollDefinitions)
      .where(and(...conditions))
      .orderBy(desc(pollDefinitions.createdAt));
    return rows.map(mapPoll);
  }

  async getById(id: string): Promise<PollDefinition | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(pollDefinitions)
      .where(eq(pollDefinitions.id, id))
      .limit(1);
    return rows[0] ? mapPoll(rows[0]) : null;
  }

  async getBySlug(slug: string): Promise<PollDefinition | null> {
    const db = getDb();
    const normalized = slug.trim().toLowerCase();
    const rows = await db
      .select()
      .from(pollDefinitions)
      .where(eq(pollDefinitions.slug, normalized))
      .limit(1);
    return rows[0] ? mapPoll(rows[0]) : null;
  }

  async create(
    input: CreatePollInput,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<PollDefinition> {
    const db = getDb();
    const slug = input.slug.trim().toLowerCase();
    const existing = await this.getBySlug(slug);
    if (existing) throw new Error("Slug already in use");

    const id = newId("poll");
    const ts = new Date();
    const questions = input.questions.map((q) => ({
      id: q.id,
      text: q.text.trim(),
      type: q.type,
      options:
        q.type === "single_choice"
          ? (q.options ?? []).map((o) => o.trim()).filter(Boolean)
          : undefined,
    }));

    await db.insert(pollDefinitions).values({
      id,
      slug,
      unionId: meta.unionId,
      localId: meta.localId,
      title: input.title.trim(),
      intro: input.intro?.trim() || null,
      questions,
      createdById: meta.createdById,
      status: input.status ?? "open",
      consentRequired: String(input.consentRequired ?? true),
      createdAt: ts,
      updatedAt: ts,
    });

    const created = await this.getById(id);
    if (!created) throw new Error("Failed to create poll");
    return created;
  }

  async update(
    id: string,
    input: UpdatePollInput,
  ): Promise<PollDefinition | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const db = getDb();
    const patch: Partial<typeof pollDefinitions.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.intro !== undefined) {
      patch.intro =
        input.intro === null || input.intro.trim() === ""
          ? null
          : input.intro.trim();
    }
    if (input.questions !== undefined) {
      patch.questions = input.questions.map((q) => ({
        id: q.id,
        text: q.text.trim(),
        type: q.type,
        options:
          q.type === "single_choice"
            ? (q.options ?? []).map((o) => o.trim()).filter(Boolean)
            : undefined,
      }));
    }
    if (input.status !== undefined) patch.status = input.status;
    if (input.consentRequired !== undefined) {
      patch.consentRequired = String(input.consentRequired);
    }
    await db
      .update(pollDefinitions)
      .set(patch)
      .where(eq(pollDefinitions.id, id));
    return this.getById(id);
  }

  async listResponses(pollId: string): Promise<PollResponse[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(pollResponses)
      .where(eq(pollResponses.pollId, pollId))
      .orderBy(desc(pollResponses.submittedAt));
    return rows.map(mapResponse);
  }

  async submitResponse(
    pollId: string,
    input: SubmitPollResponseInput,
    meta: { ipHash?: string },
  ): Promise<{ response?: PollResponse; error?: string }> {
    const poll = await this.getById(pollId);
    if (!poll) return { error: "Poll not found" };
    if (poll.status !== "open") return { error: "Poll is closed" };
    if (poll.consentRequired && !input.consentAccepted) {
      return { error: "Consent required" };
    }

    const answers: Record<string, string> = {};
    for (const q of poll.questions) {
      const raw = input.answers[q.id];
      if (typeof raw !== "string" || !raw.trim()) {
        return { error: `Missing answer for question ${q.id}` };
      }
      const value = raw.trim().slice(0, 4000);
      if (q.type === "single_choice") {
        const opts = q.options ?? [];
        if (!opts.includes(value)) {
          return { error: `Invalid option for question ${q.id}` };
        }
      }
      answers[q.id] = value;
    }

    const db = getDb();
    const responseId = newId("presp");
    const ts = new Date();
    await db.insert(pollResponses).values({
      id: responseId,
      pollId,
      unionId: poll.unionId,
      localId: poll.localId,
      answers,
      submittedAt: ts,
      consentAcceptedAt: ts,
      ipHash: meta.ipHash ?? null,
    });

    return {
      response: {
        id: responseId,
        pollId,
        answers,
        submittedAt: toIso(ts),
        consentAcceptedAt: toIso(ts),
        ipHash: meta.ipHash,
      },
    };
  }

  async aggregates(pollId: string): Promise<PollAggregates | null> {
    const poll = await this.getById(pollId);
    if (!poll) return null;
    const rows = await this.listResponses(pollId);
    return buildAggregates(poll, rows);
  }
}
