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

const now = () => new Date().toISOString();

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const polls: PollDefinition[] = [];
const responses: PollResponse[] = [];

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

export class MemoryPollsAdapter implements PollsAdapter {
  async list(filters: PollListFilters): Promise<PollDefinition[]> {
    let results = polls.filter((p) => p.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter((p) => p.localId === filters.localId);
    }
    if (filters.status) {
      results = results.filter((p) => p.status === filters.status);
    }
    return [...results].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async getById(pollId: string): Promise<PollDefinition | null> {
    return polls.find((p) => p.id === pollId) ?? null;
  }

  async getBySlug(slug: string): Promise<PollDefinition | null> {
    const normalized = slug.trim().toLowerCase();
    return polls.find((p) => p.slug === normalized) ?? null;
  }

  async create(
    input: CreatePollInput,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<PollDefinition> {
    const ts = now();
    const slug = input.slug.trim().toLowerCase();
    if (polls.some((p) => p.slug === slug)) {
      throw new Error("Slug already in use");
    }
    const poll: PollDefinition = {
      id: id("poll"),
      slug,
      unionId: meta.unionId,
      localId: meta.localId,
      title: input.title.trim(),
      intro: input.intro?.trim() || undefined,
      questions: input.questions.map((q) => ({
        id: q.id,
        text: q.text.trim(),
        type: q.type,
        options:
          q.type === "single_choice"
            ? (q.options ?? []).map((o) => o.trim()).filter(Boolean)
            : undefined,
      })),
      createdById: meta.createdById,
      status: input.status ?? "open",
      consentRequired: input.consentRequired ?? true,
      createdAt: ts,
      updatedAt: ts,
    };
    polls.push(poll);
    return poll;
  }

  async update(
    pollId: string,
    input: UpdatePollInput,
  ): Promise<PollDefinition | null> {
    const idx = polls.findIndex((p) => p.id === pollId);
    if (idx < 0) return null;
    const existing = polls[idx];
    const next: PollDefinition = { ...existing, updatedAt: now() };
    if (input.title !== undefined) next.title = input.title.trim();
    if (input.intro !== undefined) {
      next.intro =
        input.intro === null || input.intro.trim() === ""
          ? undefined
          : input.intro.trim();
    }
    if (input.questions !== undefined) {
      next.questions = input.questions.map((q) => ({
        id: q.id,
        text: q.text.trim(),
        type: q.type,
        options:
          q.type === "single_choice"
            ? (q.options ?? []).map((o) => o.trim()).filter(Boolean)
            : undefined,
      }));
    }
    if (input.status !== undefined) next.status = input.status;
    if (input.consentRequired !== undefined) {
      next.consentRequired = input.consentRequired;
    }
    polls[idx] = next;
    return next;
  }

  async listResponses(pollId: string): Promise<PollResponse[]> {
    return responses
      .filter((r) => r.pollId === pollId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
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

    const response: PollResponse = {
      id: id("presp"),
      pollId,
      answers,
      submittedAt: now(),
      consentAcceptedAt: now(),
      ipHash: meta.ipHash,
    };
    responses.push(response);
    return { response };
  }

  async aggregates(pollId: string): Promise<PollAggregates | null> {
    const poll = await this.getById(pollId);
    if (!poll) return null;
    const rows = await this.listResponses(pollId);
    return buildAggregates(poll, rows);
  }
}

export const memoryPollsStore: PollsAdapter = new MemoryPollsAdapter();

/** @internal test helper */
export function resetMemoryPollsStore(): void {
  polls.length = 0;
  responses.length = 0;
}
