/** ADR-018 — UnionOps website feedback (not union/local casework). */

export const SITE_FEEDBACK_CATEGORIES = [
  "idea",
  "issue",
  "accessibility",
  "workshop",
  "other",
] as const;

export type SiteFeedbackCategory = (typeof SITE_FEEDBACK_CATEGORIES)[number];

export const SITE_FEEDBACK_STATUSES = [
  "new",
  "triaged",
  "planned",
  "done",
  "declined",
] as const;

export type SiteFeedbackStatus = (typeof SITE_FEEDBACK_STATUSES)[number];

export const SITE_FEEDBACK_SOURCES = ["public", "hub", "portal"] as const;

export type SiteFeedbackSource = (typeof SITE_FEEDBACK_SOURCES)[number];

export type SiteFeedbackLocale = "en" | "fr";

export interface SiteFeedbackSubmission {
  id: string;
  createdAt: string;
  category: SiteFeedbackCategory;
  body: string;
  pagePath?: string;
  locale: SiteFeedbackLocale;
  source: SiteFeedbackSource;
  submitterUserId?: string;
  contactEmail?: string;
  contactName?: string;
  consentAcceptedAt: string;
  /** SHA-256 of client IP + salt — never store raw IP (ADR-015 / ADR-018). */
  ipHash?: string;
  status: SiteFeedbackStatus;
  stewardNote?: string;
}

/** Public/Hub POST body after Zod parse — no identity or status fields. */
export interface CreateSiteFeedbackInput {
  category: SiteFeedbackCategory;
  body: string;
  pagePath?: string;
  locale: SiteFeedbackLocale;
  contactEmail?: string;
  contactName?: string;
}

export interface CreateSiteFeedbackMeta {
  source: SiteFeedbackSource;
  submitterUserId?: string;
  ipHash?: string;
}

export interface UpdateSiteFeedbackInput {
  status?: SiteFeedbackStatus;
  stewardNote?: string | null;
}

export interface SiteFeedbackListFilters {
  status?: SiteFeedbackStatus;
  category?: SiteFeedbackCategory;
  source?: SiteFeedbackSource;
  limit?: number;
}

/** Inbox JSON — omits ipHash. */
export type SiteFeedbackInboxItem = Omit<SiteFeedbackSubmission, "ipHash"> & {
  signedIn: boolean;
};
