import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export type SendTransactionalEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendTransactionalEmailResult =
  | { ok: true; messageId?: string }
  | {
      ok: false;
      reason: "not_configured" | "missing_recipient" | "send_failed";
      error?: string;
    };

/** True when operators opted into SMTP sends (`EMAIL_ENABLED=true`). */
export function isEmailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === "true";
}

function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.EMAIL_FROM?.trim() &&
      process.env.SMTP_PORT?.trim(),
  );
}

let cachedTransport: Transporter | null | undefined;

/** @internal test helper — clear cached transporter between tests. */
export function resetEmailTransportForTests(): void {
  cachedTransport = undefined;
}

/**
 * Build (or reuse) a nodemailer transport from env.
 * Exposed for unit tests that inject a mock via `setEmailTransportForTests`.
 */
export function getEmailTransport(): Transporter | null {
  if (cachedTransport !== undefined) return cachedTransport;
  if (!smtpConfigured()) {
    cachedTransport = null;
    return null;
  }
  const port = Number(process.env.SMTP_PORT);
  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number.isFinite(port) ? port : 587,
    secure: port === 465,
    auth:
      process.env.SMTP_USER?.trim() && process.env.SMTP_PASS != null
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });
  return cachedTransport;
}

/** @internal test helper */
export function setEmailTransportForTests(transport: Transporter | null): void {
  cachedTransport = transport;
}

/**
 * Send a one-shot transactional message (invites, officer reminders, RSVP confirms).
 * Never used for marketing / broadcast lists (ADR-016).
 */
export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
): Promise<SendTransactionalEmailResult> {
  const to = input.to?.trim();
  if (!to) {
    return { ok: false, reason: "missing_recipient" };
  }
  if (!isEmailEnabled() || !smtpConfigured()) {
    return { ok: false, reason: "not_configured" };
  }

  const transport = getEmailTransport();
  if (!transport) {
    return { ok: false, reason: "not_configured" };
  }

  try {
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    return { ok: false, reason: "send_failed", error: message };
  }
}
