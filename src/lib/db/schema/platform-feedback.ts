import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type {
  SiteFeedbackCategory,
  SiteFeedbackLocale,
  SiteFeedbackSource,
  SiteFeedbackStatus,
} from "@/types/platform-feedback";

/**
 * Platform website feedback (ADR-018).
 * No tenant RLS — this is operator product mail, not union casework.
 * Read boundary is API RBAC (`platform_admin` only).
 */
export const platformFeedbackSubmissions = pgTable(
  "platform_feedback_submissions",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    category: text("category").notNull().$type<SiteFeedbackCategory>(),
    body: text("body").notNull(),
    pagePath: text("page_path"),
    locale: text("locale").notNull().$type<SiteFeedbackLocale>(),
    source: text("source").notNull().$type<SiteFeedbackSource>(),
    submitterUserId: text("submitter_user_id"),
    contactEmail: text("contact_email"),
    contactName: text("contact_name"),
    consentAcceptedAt: timestamp("consent_accepted_at", {
      withTimezone: true,
    }).notNull(),
    ipHash: text("ip_hash"),
    status: text("status").notNull().$type<SiteFeedbackStatus>(),
    stewardNote: text("steward_note"),
  },
  (t) => [
    index("platform_feedback_status_idx").on(t.status),
    index("platform_feedback_created_idx").on(t.createdAt),
    index("platform_feedback_category_idx").on(t.category),
  ],
);
