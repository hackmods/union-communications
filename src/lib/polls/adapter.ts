import type {
  CreatePollInput,
  PollAggregates,
  PollDefinition,
  PollListFilters,
  PollResponse,
  SubmitPollResponseInput,
  UpdatePollInput,
} from "@/types/polls";

export interface PollsAdapter {
  list(filters: PollListFilters): Promise<PollDefinition[]>;
  getById(id: string): Promise<PollDefinition | null>;
  getBySlug(slug: string): Promise<PollDefinition | null>;
  create(
    input: CreatePollInput,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<PollDefinition>;
  update(id: string, input: UpdatePollInput): Promise<PollDefinition | null>;
  listResponses(pollId: string): Promise<PollResponse[]>;
  submitResponse(
    pollId: string,
    input: SubmitPollResponseInput,
    meta: { ipHash?: string },
  ): Promise<{ response?: PollResponse; error?: string }>;
  aggregates(pollId: string): Promise<PollAggregates | null>;
}
