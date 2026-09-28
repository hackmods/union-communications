/**
 * Transactional SMTP copy builders (compat facade).
 * Announcement / ops class only — never grievance case content.
 * Implementation lives in `src/lib/email/engine/`.
 */

import {
  composeInviteAcceptEmail,
  composeOfficerMeetingReminderEmail,
  composePasswordResetEmail,
  composeRsvpConfirmationEmail,
  composeSignInLinkEmail,
  type EmailArtifact,
  type EmailLocale,
} from "@/lib/email/engine";

export type { EmailArtifact, EmailLocale };

export function buildInviteAcceptEmail(input: {
  inviteeName: string;
  acceptUrl: string;
  expiresAt: string;
  kind?: "officer" | "member" | "president";
  locale?: EmailLocale;
}): EmailArtifact {
  return composeInviteAcceptEmail(input);
}

export function buildOfficerMeetingReminderEmail(input: {
  title: string;
  startsAt: string;
  location: string;
  meetingUrl?: string;
  locale?: EmailLocale;
}): EmailArtifact {
  return composeOfficerMeetingReminderEmail(input);
}

export function buildRsvpConfirmationEmail(input: {
  title: string;
  startsAt: string;
  location: string;
  attending: string;
  joinMode?: string;
  locale?: EmailLocale;
}): EmailArtifact {
  return composeRsvpConfirmationEmail(input);
}

export function buildPasswordResetEmail(input: {
  name: string;
  resetUrl: string;
  expiresAt: string;
  locale?: EmailLocale;
}): EmailArtifact {
  return composePasswordResetEmail(input);
}

export function buildSignInLinkEmail(input: {
  name: string;
  signInUrl: string;
  expiresAt: string;
  locale?: EmailLocale;
}): EmailArtifact {
  return composeSignInLinkEmail(input);
}

/** Public base URL for links in outbound mail (no trailing slash). */
export function emailAppBaseUrl(requestOrigin?: string | null): string {
  const fromEnv = process.env.AUTH_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (requestOrigin) return requestOrigin.replace(/\/$/, "");
  return "http://localhost:3000";
}
