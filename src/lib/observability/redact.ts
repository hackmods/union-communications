/**
 * Best-effort redaction before events hit the operator store.
 * Never a substitute for not logging bodies — defense in depth.
 */

const SENSITIVE_KEY =
  /^(authorization|cookie|set-cookie|password|passwd|secret|token|api[_-]?key|session|mfa|totp|csrf)$/i;

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._\-]+/gi;
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const COOKIE_HEADER_RE = /(?:^|[\s;,])(?:cookie|set-cookie)\s*[:=]\s*[^;\n]+/gi;

const MAX_MESSAGE = 2_000;
const MAX_STACK = 8_000;
const MAX_META_KEYS = 20;
const MAX_META_VALUE = 500;

export function redactText(value: string | undefined | null): string | undefined {
  if (value == null) return undefined;
  let out = value;
  out = out.replace(BEARER_RE, "Bearer [REDACTED]");
  out = out.replace(JWT_RE, "[REDACTED_JWT]");
  out = out.replace(COOKIE_HEADER_RE, " cookie=[REDACTED]");
  out = out.replace(EMAIL_RE, "[REDACTED_EMAIL]");
  return out;
}

export function truncate(value: string | undefined, max: number): string | undefined {
  if (value == null) return undefined;
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

export function redactMeta(
  meta: Record<string, string | number | boolean | null> | undefined,
): Record<string, string | number | boolean | null> | undefined {
  if (!meta) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  let count = 0;
  for (const [key, raw] of Object.entries(meta)) {
    if (count >= MAX_META_KEYS) break;
    if (SENSITIVE_KEY.test(key)) {
      out[key] = "[REDACTED]";
      count += 1;
      continue;
    }
    if (typeof raw === "string") {
      out[key] = truncate(redactText(raw) ?? "", MAX_META_VALUE) ?? "[REDACTED]";
    } else {
      out[key] = raw;
    }
    count += 1;
  }
  return Object.keys(out).length ? out : undefined;
}

export type RedactableEventFields = {
  message: string;
  name?: string;
  stack?: string;
  digest?: string;
  route?: string;
  meta?: Record<string, string | number | boolean | null>;
};

/** Apply redaction + length caps to event fields before persist. */
export function redactEventFields<T extends RedactableEventFields>(fields: T): T {
  return {
    ...fields,
    message: truncate(redactText(fields.message) ?? "Error", MAX_MESSAGE)!,
    name: truncate(redactText(fields.name), 200),
    stack: truncate(redactText(fields.stack), MAX_STACK),
    digest: truncate(fields.digest, 200),
    route: truncate(fields.route, 500),
    meta: redactMeta(fields.meta),
  };
}
