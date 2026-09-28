/** Email Engine — shared types (fourth export lane). */

export type EmailLocale = "en" | "fr";

export type EmailChannel =
  | "transactional"
  | "security"
  | "marketing"
  | "draft";

export type EmailClassification = "transactional" | "security" | "marketing";

export type EmailBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "metaList"; rows: Array<{ label: string; value: string }> }
  | { type: "cta"; label: string; href: string }
  | { type: "divider" };

export type EmailBrandTokens = {
  productName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  /** Absolute or site-root logo URL; omitted when unavailable. */
  logoUrl?: string;
  signOff: string;
};

export type EmailDocumentInput = {
  locale: EmailLocale;
  classification: EmailClassification;
  subject: string;
  preheader?: string;
  blocks: EmailBlock[];
  brand: EmailBrandTokens;
  /** Extra footer lines after the classification disclaimer. */
  footerExtra?: string[];
};

/** Multipart artifact — always pair text + html for SMTP. */
export type EmailArtifact = {
  subject: string;
  text: string;
  html: string;
};

export type TransactionalPresetId =
  | "invite_accept"
  | "sign_in_link"
  | "password_reset"
  | "officer_meeting_reminder"
  | "rsvp_confirmation";
