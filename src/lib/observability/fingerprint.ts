import { createHash } from "node:crypto";
import type {
  ObservabilityEvent,
  ObservabilityEventInput,
  ObservabilityLevel,
} from "@/lib/observability/types";

const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const HEX_RE = /\b[0-9a-f]{16,}\b/gi;
const NUM_RE = /\b\d+\b/g;

/** Collapse volatile IDs so repeats group as one issue. */
export function normalizeFingerprintMessage(message: string): string {
  return message
    .replace(UUID_RE, "<id>")
    .replace(HEX_RE, "<hex>")
    .replace(NUM_RE, "<n>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240)
    .toLowerCase();
}

export function routePrefixForFingerprint(route: string | undefined): string {
  if (!route) return "";
  const trimmed = route.trim();
  if (!trimmed) return "";
  // Keep first 3 path segments; normalize volatile segments so /api/x/111 ≈ /api/x/222.
  const parts = trimmed
    .split("/")
    .filter(Boolean)
    .slice(0, 3)
    .map((seg) => {
      if (/^[0-9a-f-]{8,}$/i.test(seg) || /^\d+$/.test(seg)) return "<id>";
      return seg.toLowerCase();
    });
  return `/${parts.join("/")}`;
}

export function computeFingerprint(input: {
  level: ObservabilityLevel;
  name?: string;
  message: string;
  route?: string;
}): string {
  const key = [
    input.level,
    (input.name ?? "").trim().toLowerCase(),
    normalizeFingerprintMessage(input.message),
    routePrefixForFingerprint(input.route),
  ].join("|");
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

/** Ensure fingerprint is present (compute when missing). */
export function withFingerprint<T extends ObservabilityEvent | ObservabilityEventInput>(
  event: T,
): T & { fingerprint: string } {
  if (event.fingerprint && event.fingerprint.length > 0) {
    return event as T & { fingerprint: string };
  }
  return {
    ...event,
    fingerprint: computeFingerprint({
      level: event.level,
      name: event.name,
      message: event.message,
      route: event.route,
    }),
  };
}
