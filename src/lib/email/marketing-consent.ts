import { domainToASCII } from "node:url";

export type MarketingConsentEventInput =
  | { id: string; type: "grant"; occurredAt: string; wordingVersion: string }
  | { id: string; type: "confirmation"; occurredAt: string; grantEventId: string }
  | { id: string; type: "withdrawal" | "unsubscribe"; occurredAt: string }
  | {
      id: string;
      type: "admin_correction";
      occurredAt: string;
      invalidatedGrantEventId: string;
      reason: string;
    };

export type MarketingConsentEvent = MarketingConsentEventInput & { sequence: number };

export type MarketingConsentState =
  | { status: "none" }
  | {
      status: "pending_confirmation" | "confirmed" | "suppressed";
      grantEventId: string;
      wordingVersion: string;
      grantedAt: string;
      confirmedAt?: string;
      suppressedAt?: string;
      suppressionEventId?: string;
    };

/**
 * Normalize one self-submitted address. Preserve local-part case and plus tags
 * for delivery; canonicalize only the internationalized/lowercase domain.
 * Do not derive addresses from Hub, Portal, or union rosters.
 */
export function normalizeMarketingEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (!input || input.length > 254 || /\s|[\u0000-\u001f\u007f<>(),;:]/u.test(input)) return null;

  const at = input.lastIndexOf("@");
  if (at <= 0 || at !== input.indexOf("@") || at > 64 || at === input.length - 1) return null;
  const local = input.slice(0, at);
  const domain = domainToASCII(input.slice(at + 1));
  if (
    !domain ||
    domain.length > 253 ||
    !domain.includes(".") ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..") ||
    !/^[a-zA-Z0-9!#$%&'*+/=?^_\x60{|}~.-]+$/u.test(local) ||
    domain.split(".").some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label))
  ) {
    return null;
  }
  return local + "@" + domain.toLowerCase();
}

/** Case-folded lookup key for provider/list deduplication; never use it to send. */
export function marketingEmailLookupKey(value: unknown): string | null {
  return normalizeMarketingEmail(value)?.toLowerCase() ?? null;
}

/**
 * Derive current eligibility from append-only consent events. Sequence is the
 * database-assigned event order, not a client timestamp. A confirmation must
 * reference the latest grant; a later grant resets the address to pending.
 * Withdrawal, unsubscribe, or a justified correction can only suppress sending.
 */
export function deriveMarketingConsentState(
  input: readonly MarketingConsentEvent[],
): MarketingConsentState {
  const orderedEvents = [...input].sort((left, right) => left.sequence - right.sequence);
  const seenSequences = new Set<number>();
  const seenEventIds = new Set<string>();
  for (const event of orderedEvents) {
    if (
      !Number.isSafeInteger(event.sequence) ||
      event.sequence < 1 ||
      seenSequences.has(event.sequence)
    ) {
      throw new Error("Marketing consent event has an invalid sequence");
    }
    if (!event.id.trim() || seenEventIds.has(event.id)) {
      throw new Error("Marketing consent event has an invalid or duplicate ID");
    }
    seenSequences.add(event.sequence);
    seenEventIds.add(event.id);
    if (event.type === "confirmation" && !event.grantEventId.trim()) {
      throw new Error("Marketing confirmation is missing its grant reference");
    }
    if (
      event.type === "admin_correction" &&
      (!event.invalidatedGrantEventId.trim() || !event.reason.trim())
    ) {
      throw new Error("Marketing consent correction is missing its target or reason");
    }
  }
  const events = orderedEvents.map((event) => {
    if (!Number.isFinite(Date.parse(event.occurredAt))) {
      throw new Error("Marketing consent event has an invalid server timestamp");
    }
    return event;
  });

  let state: MarketingConsentState = { status: "none" };
  for (const event of events) {
    if (event.type === "grant") {
      if (!event.wordingVersion.trim()) {
        throw new Error("Marketing consent grant is missing its wording version");
      }
      state = {
        status: "pending_confirmation",
        grantEventId: event.id,
        wordingVersion: event.wordingVersion,
        grantedAt: event.occurredAt,
      };
      continue;
    }

    if (event.type === "confirmation") {
      if (
        state.status === "pending_confirmation" &&
        event.grantEventId === state.grantEventId &&
        Date.parse(event.occurredAt) >= Date.parse(state.grantedAt)
      ) {
        state = { ...state, status: "confirmed", confirmedAt: event.occurredAt };
      }
      continue;
    }

    if (event.type === "withdrawal" || event.type === "unsubscribe") {
      if (state.status !== "none") {
        state = {
          ...state,
          status: "suppressed",
          suppressedAt: event.occurredAt,
          suppressionEventId: event.id,
        };
      }
      continue;
    }

    if (event.type === "admin_correction") {
      if (state.status !== "none" && event.invalidatedGrantEventId === state.grantEventId) {
        state = {
          ...state,
          status: "suppressed",
          suppressedAt: event.occurredAt,
          suppressionEventId: event.id,
        };
      }
      continue;
    }
    throw new Error("Marketing consent event has an unsupported type");
  }
  return state;
}

export function canSendMarketingEmail(events: readonly MarketingConsentEvent[]): boolean {
  return deriveMarketingConsentState(events).status === "confirmed";
}
