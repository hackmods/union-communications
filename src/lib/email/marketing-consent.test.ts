import { describe, expect, it } from "vitest";
import {
  canSendMarketingEmail,
  deriveMarketingConsentState,
  marketingEmailLookupKey,
  normalizeMarketingEmail,
  type MarketingConsentEvent,
  type MarketingConsentEventInput,
} from "./marketing-consent";

const events = (...rows: MarketingConsentEventInput[]) => rows.map((event, index) => ({
  ...event,
  sequence: index + 1,
})) as MarketingConsentEvent[];

describe("product-news consent state", () => {
  it("normalizes a self-submitted address without removing plus tags", () => {
    expect(normalizeMarketingEmail("  Riley+union@EXAMPLE.org  ")).toBe("Riley+union@example.org");
    expect(marketingEmailLookupKey("Riley+union@EXAMPLE.org")).toBe("riley+union@example.org");
    expect(normalizeMarketingEmail("person@exämple.org")).toBe("person@xn--exmple-cua.org");
  });

  it("rejects malformed addresses and header-injection characters", () => {
    expect(normalizeMarketingEmail("")).toBeNull();
    expect(normalizeMarketingEmail("one@@example.org")).toBeNull();
    expect(normalizeMarketingEmail("person@example.org\r\nBcc: other@example.org")).toBeNull();
    expect(normalizeMarketingEmail(".person@example.org")).toBeNull();
    expect(normalizeMarketingEmail("person@not_a_domain.org")).toBeNull();
  });

  it("requires a matching confirmation after the latest affirmative grant", () => {
    const grant: MarketingConsentEventInput = {
      id: "grant-1", type: "grant", occurredAt: "2026-09-27T12:00:00.000Z", wordingVersion: "product-news-v1",
    };
    expect(deriveMarketingConsentState(events(grant))).toMatchObject({
      status: "pending_confirmation", grantEventId: "grant-1",
    });
    expect(canSendMarketingEmail(events(grant))).toBe(false);
    expect(canSendMarketingEmail(events(
      grant,
      { id: "confirm-old", type: "confirmation", occurredAt: "2026-09-27T12:01:00.000Z", grantEventId: "older-grant" },
    ))).toBe(false);
    expect(canSendMarketingEmail(events(
      grant,
      { id: "confirm-1", type: "confirmation", occurredAt: "2026-09-27T12:01:00.000Z", grantEventId: "grant-1" },
    ))).toBe(true);
  });

  it("uses database sequence order and rejects a confirmation timestamp before its grant", () => {
    const history = events(
      { id: "grant-1", type: "grant", occurredAt: "2026-09-27T12:02:00.000Z", wordingVersion: "product-news-v1" },
      { id: "confirm-1", type: "confirmation", occurredAt: "2026-09-27T12:01:00.000Z", grantEventId: "grant-1" },
    );
    expect(canSendMarketingEmail(history)).toBe(false);
    expect(() => deriveMarketingConsentState(history.map((event) => ({ ...event, sequence: 3 }))))
      .toThrow(/invalid sequence/i);
  });

  it("does not let a late confirmation revive a withdrawn or unsubscribed grant", () => {
    const grant: MarketingConsentEventInput = {
      id: "grant-1", type: "grant", occurredAt: "2026-09-27T12:00:00.000Z", wordingVersion: "product-news-v1",
    };
    const confirmation: MarketingConsentEventInput = {
      id: "confirm-1", type: "confirmation", occurredAt: "2026-09-27T12:01:00.000Z", grantEventId: "grant-1",
    };
    const withdrawal: MarketingConsentEventInput = {
      id: "withdraw-1", type: "withdrawal", occurredAt: "2026-09-27T12:02:00.000Z",
    };
    const unsubscribe: MarketingConsentEventInput = {
      id: "unsubscribe-1", type: "unsubscribe", occurredAt: "2026-09-27T12:03:00.000Z",
    };
    expect(canSendMarketingEmail(events(grant, confirmation, withdrawal, unsubscribe))).toBe(false);
    expect(deriveMarketingConsentState(events(grant, confirmation, withdrawal))).toMatchObject({ status: "suppressed" });
  });

  it("requires fresh confirmation after re-subscription and lets a correction only suppress", () => {
    const firstGrant: MarketingConsentEventInput = {
      id: "grant-1", type: "grant", occurredAt: "2026-09-27T12:00:00.000Z", wordingVersion: "product-news-v1",
    };
    const firstConfirmation: MarketingConsentEventInput = {
      id: "confirm-1", type: "confirmation", occurredAt: "2026-09-27T12:01:00.000Z", grantEventId: "grant-1",
    };
    const unsubscribe: MarketingConsentEventInput = {
      id: "unsubscribe-1", type: "unsubscribe", occurredAt: "2026-09-27T12:02:00.000Z",
    };
    const secondGrant: MarketingConsentEventInput = {
      id: "grant-2", type: "grant", occurredAt: "2026-09-27T12:03:00.000Z", wordingVersion: "product-news-v1",
    };
    const history = events(firstGrant, firstConfirmation, unsubscribe, secondGrant);
    expect(canSendMarketingEmail(history)).toBe(false);
    expect(canSendMarketingEmail(events(
      ...history,
      { id: "correction-1", type: "admin_correction", occurredAt: "2026-09-27T12:04:00.000Z", invalidatedGrantEventId: "grant-2", reason: "Consent evidence was misattributed" },
      { id: "confirm-2", type: "confirmation", occurredAt: "2026-09-27T12:05:00.000Z", grantEventId: "grant-2" },
    ))).toBe(false);
    expect(canSendMarketingEmail(events(
      ...history,
      { id: "confirm-2", type: "confirmation", occurredAt: "2026-09-27T12:05:00.000Z", grantEventId: "grant-2" },
    ))).toBe(true);
    expect(() => deriveMarketingConsentState(events(
      ...history,
      { id: "correction-empty", type: "admin_correction", occurredAt: "2026-09-27T12:04:00.000Z", invalidatedGrantEventId: "grant-2", reason: " " },
    ))).toThrow(/correction is missing its reason/i);
  });

  it("fails closed for malformed server evidence", () => {
    expect(() => deriveMarketingConsentState(events({
      id: "grant-1", type: "grant", occurredAt: "not-a-date", wordingVersion: "product-news-v1",
    }))).toThrow(/invalid server timestamp/i);
    expect(() => deriveMarketingConsentState(events({
      id: "grant-1", type: "grant", occurredAt: "2026-09-27T12:00:00.000Z", wordingVersion: " ",
    }))).toThrow(/wording version/i);
  });
});
