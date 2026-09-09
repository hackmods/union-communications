import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { reportServerError } from "@/lib/observability/report-server-error";

export type SendTransactionalEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendTransactionalEmailResult =
  | { ok: true; messageId?: string; transport?: "smtp" | "mailgun_api" }
  | {
      ok: false;
      reason: "not_configured" | "missing_recipient" | "send_failed";
      error?: string;
      /** Safe SMTP / Mailgun snapshot for audit / operator logs (never includes secrets). */
      smtp?: SmtpConfigSnapshot;
    };

/** Public, non-secret view of email env — safe for health / email-status. */
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
  /** Mailgun HTTP API key present (preferred on DigitalOcean — SMTP 465/587 are blocked). */
  mailgunApiConfigured: boolean;
  mailgunDomain: string | null;
  mailgunApiBase: string | null;
  /** Which transport will be attempted first. */
  preferredTransport: "mailgun_api" | "smtp" | "none";
};

const LOG_PREFIX = "[email/smtp]";
const SMTP_TIMEOUT_MS = 12_000;
/** Mailgun alternate SMTP port — some hosts block 465/587 but allow 2525. */
const SMTP_FALLBACK_PORT = 2525;

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

/** Extract domain from `Name <user@domain>` or bare `user@domain`. */
export function domainFromEmailFrom(from: string | undefined): string | null {
  if (!from) return null;
  const angle = from.match(/<([^>]+)>/);
  const addr = (angle?.[1] ?? from).trim();
  const at = addr.lastIndexOf("@");
  if (at < 0) return null;
  const domain = addr.slice(at + 1).trim().toLowerCase();
  return domain || null;
}

function mailgunApiBase(): string {
  const explicit = readSmtpEnv("MAILGUN_API_BASE").value;
  if (explicit) return explicit.replace(/\/$/, "");
  const region = readSmtpEnv("MAILGUN_API_REGION").value?.toLowerCase();
  if (region === "eu") return "https://api.eu.mailgun.net";
  return "https://api.mailgun.net";
}

function mailgunDomain(): string | null {
  return (
    readSmtpEnv("MAILGUN_DOMAIN").value?.toLowerCase() ??
    domainFromEmailFrom(readSmtpEnv("EMAIL_FROM").value) ??
    null
  );
}

function mailgunApiConfigured(): boolean {
  return Boolean(readSmtpEnv("MAILGUN_API_KEY").value && mailgunDomain());
}

/** Snapshot of email config with secrets redacted. */
export function getSmtpConfigSnapshot(): SmtpConfigSnapshot {
  const host = readSmtpEnv("SMTP_HOST");
  const from = readSmtpEnv("EMAIL_FROM");
  const user = readSmtpEnv("SMTP_USER");
  const pass = readSmtpEnv("SMTP_PASS");
  const port = smtpPort();
  const userPresent = Boolean(user.value);
  const apiOk = mailgunApiConfigured();
  const smtpOk = Boolean(host.value && from.value && port != null);
  const domain = mailgunDomain();
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
      readSmtpEnv("SMTP_PORT").strippedQuotes ||
      readSmtpEnv("MAILGUN_API_KEY").strippedQuotes ||
      readSmtpEnv("MAILGUN_DOMAIN").strippedQuotes,
    mailgunApiConfigured: apiOk,
    mailgunDomain: domain,
    mailgunApiBase: apiOk ? mailgunApiBase() : null,
    preferredTransport: apiOk ? "mailgun_api" : smtpOk ? "smtp" : "none",
  };
}

/** True when operators opted into outbound sends (`EMAIL_ENABLED=true`). */
export function isEmailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === "true";
}

function smtpConfigured(): boolean {
  const snap = getSmtpConfigSnapshot();
  return Boolean(snap.host && snap.from && snap.port != null);
}

/** True when EMAIL_ENABLED and either Mailgun HTTP API or SMTP host/from/port are set. */
export function isTransactionalEmailAvailable(): boolean {
  return isEmailEnabled() && (mailgunApiConfigured() || smtpConfigured());
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

function transportCacheKey(
  host: string,
  port: number,
  secure: boolean,
  user: string,
  from: string,
): string {
  return `${host}:${port}:${secure}:${user}:${from}`;
}

function createSmtpTransport(opts: {
  host: string;
  port: number;
  secure: boolean;
}): Transporter {
  const user = readSmtpEnv("SMTP_USER").value;
  const pass = readSmtpEnv("SMTP_PASS").value;
  return nodemailer.createTransport({
    host: opts.host,
    port: opts.port,
    secure: opts.secure,
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
  const user = readSmtpEnv("SMTP_USER").value ?? "";
  const from = snap.from ?? "";
  const host = snap.host ?? "";
  const port = snap.port ?? 587;
  const key = transportCacheKey(host, port, snap.secure, user, from);
  if (cached && cached.key === key) return cached.transport;

  const transport = createSmtpTransport({
    host,
    port,
    secure: snap.secure,
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

function isSmtpConnTimeout(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const e = err as Error & { code?: string; command?: string };
  const code = (e.code ?? "").toUpperCase();
  const command = (e.command ?? "").toUpperCase();
  return (
    command === "CONN" &&
    (code === "ETIMEDOUT" ||
      code === "ECONNREFUSED" ||
      code === "ESOCKET" ||
      /timeout/i.test(e.message))
  );
}

async function sendViaMailgunApi(
  input: SendTransactionalEmailInput & { to: string },
  smtp: SmtpConfigSnapshot,
): Promise<SendTransactionalEmailResult> {
  const apiKey = readSmtpEnv("MAILGUN_API_KEY").value;
  const domain = smtp.mailgunDomain;
  const base = smtp.mailgunApiBase ?? mailgunApiBase();
  if (!apiKey || !domain) {
    return { ok: false, reason: "not_configured", smtp };
  }

  const url = `${base}/v3/${encodeURIComponent(domain)}/messages`;
  console.info(`${LOG_PREFIX} attempt mailgun_api`, {
    toDomain: input.to.includes("@") ? input.to.split("@")[1] : null,
    subject: input.subject.slice(0, 80),
    smtp,
  });

  try {
    const body = new URLSearchParams();
    body.set("from", smtp.from ?? `noreply@${domain}`);
    body.set("to", input.to);
    body.set("subject", input.subject);
    body.set("text", input.text);
    if (input.html) body.set("html", input.html);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(SMTP_TIMEOUT_MS),
    });

    const raw = await res.text();
    let parsed: { id?: string; message?: string } = {};
    try {
      parsed = JSON.parse(raw) as { id?: string; message?: string };
    } catch {
      /* non-JSON error body */
    }

    if (!res.ok) {
      const error = `Mailgun API ${res.status}: ${parsed.message ?? raw.slice(0, 200)}`;
      console.error(`${LOG_PREFIX} send_failed mailgun_api`, { error, smtp });
      void reportServerError(new Error(error), { route: "email/mailgun_api" });
      return { ok: false, reason: "send_failed", error, smtp };
    }

    console.info(`${LOG_PREFIX} sent mailgun_api`, {
      messageId: parsed.id,
      smtp,
    });
    return { ok: true, messageId: parsed.id, transport: "mailgun_api" };
  } catch (err) {
    const message = formatSendError(err);
    console.error(`${LOG_PREFIX} send_failed mailgun_api`, {
      error: message,
      smtp,
    });
    void reportServerError(err, { route: "email/mailgun_api" });
    return { ok: false, reason: "send_failed", error: message, smtp };
  }
}

type SmtpAttempt = {
  result: SendTransactionalEmailResult;
  connTimeout: boolean;
};

async function sendViaSmtp(
  input: SendTransactionalEmailInput & { to: string },
  smtp: SmtpConfigSnapshot,
  transport: Transporter,
  label: string,
): Promise<SmtpAttempt> {
  console.info(`${LOG_PREFIX} attempt ${label}`, {
    toDomain: input.to.includes("@") ? input.to.split("@")[1] : null,
    subject: input.subject.slice(0, 80),
    smtp,
  });

  try {
    const info = await transport.sendMail({
      from: smtp.from ?? undefined,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    console.info(`${LOG_PREFIX} sent ${label}`, {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
      smtp,
    });
    return {
      result: { ok: true, messageId: info.messageId, transport: "smtp" },
      connTimeout: false,
    };
  } catch (err) {
    const message = formatSendError(err);
    const connTimeout = isSmtpConnTimeout(err);
    console.error(`${LOG_PREFIX} send_failed ${label}`, { error: message, smtp });
    void reportServerError(err, { route: `email/${label}` });
    return {
      result: { ok: false, reason: "send_failed", error: message, smtp },
      connTimeout,
    };
  }
}

/**
 * Send a one-shot transactional message (invites, officer reminders, RSVP confirms).
 * Never used for marketing / broadcast lists (ADR-016).
 *
 * Prefer Mailgun HTTP API when configured — DigitalOcean Droplets block outbound
 * SMTP on 25/465/587 (CONN ETIMEDOUT). SMTP remains for hosts that allow it;
 * on CONN timeout to 465/587 we retry Mailgun's alternate port 2525 once.
 */
export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
): Promise<SendTransactionalEmailResult> {
  const to = input.to?.trim();
  if (!to) {
    return { ok: false, reason: "missing_recipient" };
  }

  const smtp = getSmtpConfigSnapshot();
  const payload = { ...input, to };

  if (!isEmailEnabled() || smtp.preferredTransport === "none") {
    console.warn(`${LOG_PREFIX} skip not_configured`, {
      emailEnabled: isEmailEnabled(),
      smtp,
      toDomain: to.includes("@") ? to.split("@")[1] : null,
    });
    return { ok: false, reason: "not_configured", smtp };
  }

  if (!smtp.authConfigured && smtp.preferredTransport === "smtp") {
    console.warn(
      `${LOG_PREFIX} auth missing — Mailgun will reject or never accept; set SMTP_USER + SMTP_PASS (SMTP credentials, not API key), or set MAILGUN_API_KEY + MAILGUN_DOMAIN for HTTPS on DigitalOcean`,
      { smtp },
    );
  }

  // Prefer HTTPS API on CapRover/DigitalOcean (SMTP ports blocked).
  if (smtp.preferredTransport === "mailgun_api") {
    return sendViaMailgunApi(payload, smtp);
  }

  const transport = getEmailTransport();
  if (!transport) {
    console.warn(`${LOG_PREFIX} skip no transport`, { smtp });
    return { ok: false, reason: "not_configured", smtp };
  }

  const primary = await sendViaSmtp(payload, smtp, transport, "smtp");
  if (primary.result.ok) return primary.result;

  // DigitalOcean blocks 465/587; Mailgun still listens on 2525 for some networks.
  const port = smtp.port;
  if (
    primary.connTimeout &&
    smtp.host &&
    port != null &&
    port !== SMTP_FALLBACK_PORT &&
    (port === 465 || port === 587)
  ) {
    console.warn(
      `${LOG_PREFIX} CONN timeout on port ${port} — retrying SMTP ${SMTP_FALLBACK_PORT} (DigitalOcean often blocks 465/587; prefer MAILGUN_API_KEY)`,
      { smtp },
    );
    const fallbackTransport = createSmtpTransport({
      host: smtp.host,
      port: SMTP_FALLBACK_PORT,
      secure: false,
    });
    const fallbackSmtp: SmtpConfigSnapshot = {
      ...smtp,
      port: SMTP_FALLBACK_PORT,
      secure: false,
    };
    const retry = await sendViaSmtp(
      payload,
      fallbackSmtp,
      fallbackTransport,
      `smtp:${SMTP_FALLBACK_PORT}`,
    );
    if (retry.result.ok) return retry.result;
    const retryError = retry.result.ok ? "" : retry.result.error;
    return {
      ok: false,
      reason: "send_failed",
      error: [
        primary.result.ok ? "" : primary.result.error,
        `fallback ${SMTP_FALLBACK_PORT}: ${retryError ?? ""}`,
        "DigitalOcean blocks outbound SMTP 465/587 — set MAILGUN_API_KEY + MAILGUN_DOMAIN for HTTPS",
      ]
        .filter(Boolean)
        .join(" | "),
      smtp,
    };
  }

  if (primary.connTimeout && !primary.result.ok) {
    return {
      ok: false,
      reason: "send_failed",
      error: `${primary.result.error} | hint=DigitalOcean blocks SMTP 465/587 — set MAILGUN_API_KEY + MAILGUN_DOMAIN`,
      smtp,
    };
  }

  return primary.result;
}
