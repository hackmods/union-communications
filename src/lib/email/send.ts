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
      /** Safe SMTP snapshot for audit / operator logs (never includes password). */
      smtp?: SmtpConfigSnapshot;
    };

/** Public, non-secret view of SMTP env — safe for health / email-status. */
export type SmtpConfigSnapshot = {
  host: string | null;
  port: number | null;
  secure: boolean;
  from: string | null;
  authConfigured: boolean;
  userPresent: boolean;
  /** True when SMTP_USER looks like an email (Mailgun expects postmaster@domain). */
  userLooksLikeEmail: boolean;
  /** True when CapRover-style wrapping quotes were stripped from an env value. */
  strippedQuotes: boolean;
};

const LOG_PREFIX = "[email/smtp]";
const SMTP_TIMEOUT_MS = 12_000;

/** Trim env and strip a single layer of wrapping quotes (common CapRover paste). */
export function readSmtpEnv(name: string): {
  value: string | undefined;
  strippedQuotes: boolean;
} {
  const raw = process.env[name];
  if (raw == null) return { value: undefined, strippedQuotes: false };
  let value = raw.trim();
  let strippedQuotes = false;
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
    strippedQuotes = true;
  }
  return { value: value || undefined, strippedQuotes };
}

function smtpPort(): number | null {
  const { value } = readSmtpEnv("SMTP_PORT");
  if (!value) return null;
  const port = Number(value);
  return Number.isFinite(port) ? port : null;
}

/** Snapshot of SMTP config with secrets redacted. */
export function getSmtpConfigSnapshot(): SmtpConfigSnapshot {
  const host = readSmtpEnv("SMTP_HOST");
  const from = readSmtpEnv("EMAIL_FROM");
  const user = readSmtpEnv("SMTP_USER");
  const pass = readSmtpEnv("SMTP_PASS");
  const port = smtpPort();
  const userPresent = Boolean(user.value);
  return {
    host: host.value ?? null,
    port,
    secure: port === 465,
    from: from.value ?? null,
    authConfigured: userPresent && pass.value != null,
    userPresent,
    userLooksLikeEmail: Boolean(user.value?.includes("@")),
    strippedQuotes:
      host.strippedQuotes ||
      from.strippedQuotes ||
      user.strippedQuotes ||
      pass.strippedQuotes ||
      readSmtpEnv("SMTP_PORT").strippedQuotes,
  };
}

/** True when operators opted into SMTP sends (`EMAIL_ENABLED=true`). */
export function isEmailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === "true";
}

function smtpConfigured(): boolean {
  const snap = getSmtpConfigSnapshot();
  return Boolean(snap.host && snap.from && snap.port != null);
}

/** True when EMAIL_ENABLED and SMTP host/from/port are set. */
export function isTransactionalEmailAvailable(): boolean {
  return isEmailEnabled() && smtpConfigured();
}

type CachedTransport = {
  transport: Transporter;
  /** host:port:secure:user — recreate when CapRover env changes without cold start. */
  key: string;
};

let cached: CachedTransport | null | undefined;

/** @internal test helper — clear cached transporter between tests. */
export function resetEmailTransportForTests(): void {
  cached = undefined;
}

function transportCacheKey(snap: SmtpConfigSnapshot): string {
  const user = readSmtpEnv("SMTP_USER").value ?? "";
  return `${snap.host}:${snap.port}:${snap.secure}:${user}:${snap.from}`;
}

/**
 * Build (or reuse) a nodemailer transport from env.
 * Exposed for unit tests that inject a mock via `setEmailTransportForTests`.
 */
export function getEmailTransport(): Transporter | null {
  if (!smtpConfigured()) {
    cached = null;
    return null;
  }
  const snap = getSmtpConfigSnapshot();
  const key = transportCacheKey(snap);
  if (cached && cached.key === key) return cached.transport;

  const user = readSmtpEnv("SMTP_USER").value;
  const pass = readSmtpEnv("SMTP_PASS").value;
  const port = snap.port ?? 587;

  const transport = nodemailer.createTransport({
    host: snap.host ?? undefined,
    port,
    secure: snap.secure,
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
    auth:
      user && pass != null
        ? {
            user,
            pass,
          }
        : undefined,
  });
  cached = { transport, key };
  return transport;
}

/** @internal test helper */
export function setEmailTransportForTests(transport: Transporter | null): void {
  if (transport == null) {
    cached = null;
    return;
  }
  cached = { transport, key: "test" };
}

function formatSendError(err: unknown): string {
  if (!(err instanceof Error)) return "Send failed";
  const e = err as Error & {
    code?: string;
    command?: string;
    response?: string;
    responseCode?: number;
    errno?: number;
    syscall?: string;
    address?: string;
    port?: number;
  };
  const parts = [e.message];
  if (e.code) parts.push(`code=${e.code}`);
  if (e.responseCode != null) parts.push(`responseCode=${e.responseCode}`);
  if (e.command) parts.push(`command=${e.command}`);
  if (e.response) parts.push(`response=${e.response}`);
  if (e.syscall) parts.push(`syscall=${e.syscall}`);
  if (e.address) parts.push(`address=${e.address}`);
  if (e.port != null) parts.push(`port=${e.port}`);
  if (e.errno != null) parts.push(`errno=${e.errno}`);
  return parts.join(" | ");
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

  const smtp = getSmtpConfigSnapshot();

  if (!isEmailEnabled() || !smtpConfigured()) {
    console.warn(`${LOG_PREFIX} skip not_configured`, {
      emailEnabled: isEmailEnabled(),
      smtp,
      toDomain: to.includes("@") ? to.split("@")[1] : null,
    });
    return { ok: false, reason: "not_configured", smtp };
  }

  const transport = getEmailTransport();
  if (!transport) {
    console.warn(`${LOG_PREFIX} skip no transport`, { smtp });
    return { ok: false, reason: "not_configured", smtp };
  }

  if (!smtp.authConfigured) {
    console.warn(
      `${LOG_PREFIX} auth missing — Mailgun will reject or never accept; set SMTP_USER + SMTP_PASS (SMTP credentials, not API key)`,
      { smtp },
    );
  }

  console.info(`${LOG_PREFIX} attempt`, {
    toDomain: to.includes("@") ? to.split("@")[1] : null,
    subject: input.subject.slice(0, 80),
    smtp,
  });

  try {
    const info = await transport.sendMail({
      from: smtp.from ?? undefined,
      to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    console.info(`${LOG_PREFIX} sent`, {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
      smtp,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const message = formatSendError(err);
    console.error(`${LOG_PREFIX} send_failed`, { error: message, smtp });
    return { ok: false, reason: "send_failed", error: message, smtp };
  }
}
