/** Email Engine — shared types (fourth export lane). */

export type EmailLocale = "en" | "fr";

export type EmailChannel =
  | "transactional"
  | "security"
  | "marketing"
  | "draft";

export type EmailClassification = "transactional" | "security" | "marketing";

/** multipart = HTML table + text; plain = text-first (simple html mirror). */
export type EmailFormat = "multipart" | "plain";

export type EmailBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "metaList"; rows: Array<{ label: string; value: string }> }
  | { type: "cta"; label: string; href: string }
  | { type: "divider" }
  | {
      type: "issueList";
      items: Array<{
        fingerprint: string;
        count: number;
        sampleMessage: string;
        level: string;
      }>;
    }
  | { type: "codeFence"; text: string; language?: string }
  | { type: "bulletList"; items: string[] }
  | {
      type: "severityCallout";
      severity: "error" | "warn" | "info";
      text: string;
    };

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
  /** Default multipart. Plain prefers text; html is a minimal mirror. */
  format?: EmailFormat;
};

/** Multipart artifact — always pair text + html for SMTP. */
export type EmailArtifact = {
  subject: string;
  text: string;
  html: string;
  format?: EmailFormat;
};

export type TransactionalPresetId =
  | "invite_accept"
  | "sign_in_link"
  | "password_reset"
  | "officer_meeting_reminder"
  | "rsvp_confirmation";
