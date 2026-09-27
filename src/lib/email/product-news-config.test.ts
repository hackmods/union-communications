import { describe, expect, it } from "vitest";
import {
  createProductNewsToken,
  productNewsTokenHash,
  readProductNewsConfig,
  PRODUCT_NEWS_NOTICE_VERSION,
  verifyProductNewsToken,
} from "./product-news-config";

const firstKey = "this-is-a-stable-product-news-signing-key-0001";
const nextKey = "this-is-a-stable-product-news-signing-key-0002";

describe("product-news action links", () => {
  it("binds purpose and expiry and stores only a hash", () => {
    const now = Date.now();
    const issued = createProductNewsToken("unsubscribe", new Date(now + 65 * 86400_000), [firstKey]);
    expect(issued.token).not.toContain("@");
    expect(issued.hash).toBe(productNewsTokenHash(issued.token));
    expect(verifyProductNewsToken(issued.token, "unsubscribe", [firstKey], now)).toBe(issued.hash);
    expect(verifyProductNewsToken(issued.token, "confirm", [firstKey], now)).toBeNull();
    expect(verifyProductNewsToken(issued.token, "unsubscribe", [firstKey], now + 66 * 86400_000)).toBeNull();
  });

  it("rejects tampering and preserves old links while a key rotates", () => {
    const issued = createProductNewsToken("preferences", new Date(Date.now() + 60_000), [firstKey]);
    expect(verifyProductNewsToken(issued.token, "preferences", [nextKey, firstKey])).toBe(issued.hash);
    expect(verifyProductNewsToken(issued.token, "preferences", [nextKey])).toBeNull();
    const [payload, signature] = issued.token.split(".");
    expect(verifyProductNewsToken(`${payload}A.${signature}`, "preferences", [firstKey])).toBeNull();
  });
});

describe("product-news release configuration", () => {
  const complete = {
    NODE_ENV: "production" as const,
    UNIONOPS_PRODUCT_NEWS_ENABLED: "true",
    UNIONOPS_PRODUCT_NEWS_APPROVED_VERSION: PRODUCT_NEWS_NOTICE_VERSION,
    UNIONOPS_PRODUCT_NEWS_APPROVAL_REFERENCE: "legal-review-2026-001",
    UNIONOPS_PRODUCT_NEWS_SENDER_NAME: "UnionOps Services",
    UNIONOPS_PRODUCT_NEWS_FROM: "news@unionops.org",
    UNIONOPS_PRODUCT_NEWS_CONTACT_EMAIL: "contact@unionops.org",
    UNIONOPS_PRODUCT_NEWS_MAILING_ADDRESS: "PO Box 123, Toronto ON",
    UNIONOPS_PRODUCT_NEWS_TOKEN_KEYS: firstKey,
    AUTH_URL: "https://unionops.org",
    DATABASE_URL: "postgres://unionops_app:pass@example.test/unionops",
    MAILGUN_API_KEY: "key-example",
    MAILGUN_DOMAIN: "unionops.org",
    MAILGUN_WEBHOOK_SIGNING_KEY: "webhook-signing-key-long-enough",
    EMAIL_ENABLED: "true",
  };
  it("stays off without explicit legal approval and feedback configuration", () => {
    expect(readProductNewsConfig({ ...complete, UNIONOPS_PRODUCT_NEWS_APPROVED_VERSION: "" }).enabled).toBe(false);
    expect(readProductNewsConfig({ ...complete, MAILGUN_WEBHOOK_SIGNING_KEY: "" }).enabled).toBe(false);
    expect(readProductNewsConfig({ ...complete, DATABASE_URL: "" }).enabled).toBe(false);
  });
  it("can be enabled by a complete CapRover configuration", () => {
    expect(readProductNewsConfig(complete).enabled).toBe(true);
  });
});
