import type { PlatformFeedbackAdapter } from "./adapter";
import type {
  CreateSiteFeedbackInput,
  CreateSiteFeedbackMeta,
  SiteFeedbackListFilters,
  SiteFeedbackSubmission,
  UpdateSiteFeedbackInput,
} from "@/types/platform-feedback";

const now = () => new Date().toISOString();

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

let submissions: SiteFeedbackSubmission[] = [];

export class MemoryPlatformFeedbackAdapter implements PlatformFeedbackAdapter {
  async create(
    input: CreateSiteFeedbackInput,
    meta: CreateSiteFeedbackMeta,
  ): Promise<SiteFeedbackSubmission> {
    const row: SiteFeedbackSubmission = {
      id: id("fb"),
      createdAt: now(),
      category: input.category,
      body: input.body,
      pagePath: input.pagePath,
      locale: input.locale,
      source: meta.source,
      submitterUserId: meta.submitterUserId,
      contactEmail: input.contactEmail,
      contactName: input.contactName,
      consentAcceptedAt: now(),
      ipHash: meta.ipHash,
      status: "new",
    };
    submissions.push(row);
    return row;
  }

  async list(
    filters: SiteFeedbackListFilters = {},
  ): Promise<SiteFeedbackSubmission[]> {
    let results = [...submissions];
    if (filters.status) {
      results = results.filter((row) => row.status === filters.status);
    }
    if (filters.category) {
      results = results.filter((row) => row.category === filters.category);
    }
    if (filters.source) {
      results = results.filter((row) => row.source === filters.source);
    }
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const limit = filters.limit ?? 200;
    return results.slice(0, limit);
  }

  async getById(rowId: string): Promise<SiteFeedbackSubmission | null> {
    return submissions.find((row) => row.id === rowId) ?? null;
  }

  async update(
    rowId: string,
    input: UpdateSiteFeedbackInput,
  ): Promise<SiteFeedbackSubmission | null> {
    const row = submissions.find((item) => item.id === rowId);
    if (!row) return null;
    if (input.status) row.status = input.status;
    if (input.stewardNote !== undefined) {
      row.stewardNote = input.stewardNote ?? undefined;
    }
    return row;
  }

  async delete(rowId: string): Promise<boolean> {
    const before = submissions.length;
    submissions = submissions.filter((row) => row.id !== rowId);
    return submissions.length < before;
  }
}

export const memoryPlatformFeedbackStore = new MemoryPlatformFeedbackAdapter();

/** @internal test helper */
export function resetMemoryPlatformFeedbackStore(): void {
  submissions = [];
}
