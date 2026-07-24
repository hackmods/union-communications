/** FUTURE-006 — Pulse poll definitions + anonymous responses. */

export type PollStatus = "open" | "closed";

export type PollQuestionType = "single_choice" | "free_text";

export interface PollQuestion {
  id: string;
  text: string;
  type: PollQuestionType;
  /** Required when type is single_choice. */
  options?: string[];
}

export interface PollDefinition {
  id: string;
  slug: string;
  unionId: string;
  localId: string;
  title: string;
  intro?: string;
  questions: PollQuestion[];
  createdById: string;
  status: PollStatus;
  /** When true, members must accept consent before submit. */
  consentRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PollResponse {
  id: string;
  pollId: string;
  /** Map of questionId → answer text (option label or free text). */
  answers: Record<string, string>;
  submittedAt: string;
  consentAcceptedAt: string;
  /** SHA-256 of client IP + salt — never store raw IP. */
  ipHash?: string;
}

export interface CreatePollInput {
  slug: string;
  title: string;
  intro?: string;
  questions: PollQuestion[];
  consentRequired?: boolean;
  status?: PollStatus;
}

export interface UpdatePollInput {
  title?: string;
  intro?: string | null;
  questions?: PollQuestion[];
  status?: PollStatus;
  consentRequired?: boolean;
}

export interface PollListFilters {
  unionId: string;
  localId?: string;
  status?: PollStatus;
}

export interface SubmitPollResponseInput {
  answers: Record<string, string>;
  consentAccepted: boolean;
}

export interface PollQuestionAggregate {
  questionId: string;
  text: string;
  type: PollQuestionType;
  /** Option label → count (single_choice). */
  optionCounts?: Record<string, number>;
  /** Free-text answers (free_text). */
  freeText?: string[];
}

export interface PollAggregates {
  pollId: string;
  responseCount: number;
  questions: PollQuestionAggregate[];
}
