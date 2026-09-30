import { describe, expect, it, afterEach } from "vitest";
import {
  createOutreachListToken,
  outreachListTokenHash,
  readOutreachListsConfig,
  OUTREACH_LIST_NOTICE_VERSION,
  verifyOutreachListToken,
} from "./outreach-config";

const key = "this-is-a-stable-outreach-list-signing-key-01";

describe("outreach-list configuration", () => {
  afterEach(() => {
    delete process.env.UNIONOPS_OUTREACH_LISTS_ENABLED;
    delete process.env.UNIONOPS_OUTREACH_LISTS_APPROVED_VERSION;
    delete process.env.UNIONOPS_OUTREACH_LISTS_APPROVAL_REFERENCE;
  });

  it("stays disabled without approval reference and notice version", () => {
    expect(
      readOutreachListsConfig({
        UNIONOPS_OUTREACH_LISTS_ENABLED: "true",
      } as unknown as NodeJS.ProcessEnv).enabled,
    ).toBe(false);
  });

  it("can enable with a complete CapRover configuration", () => {
    const cfg = readOutreachListsConfig({
      NODE_ENV: "production",
      UNIONOPS_OUTREACH_LISTS_ENABLED: "true",
      UNIONOPS_OUTREACH_LISTS_APPROVED_VERSION: OUTREACH_LIST_NOTICE_VERSION,
      UNIONOPS_OUTREACH_LISTS_APPROVAL_REFERENCE: "legal-review-outreach-2026-001",
      UNIONOPS_OUTREACH_LISTS_SENDER_NAME: "Example Union",
      UNIONOPS_OUTREACH_LISTS_FROM: "news@unionops.org",
      UNIONOPS_OUTREACH_LISTS_CONTACT_EMAIL: "contact@unionops.org",
      UNIONOPS_OUTREACH_LISTS_MAILING_ADDRESS: "PO Box 1",
      UNIONOPS_OUTREACH_LISTS_TOKEN_KEYS: key,
      AUTH_URL: "https://unionops.org",
      DATABASE_URL: "postgres://unionops_app:pass@example.test/unionops",
      MAILGUN_API_KEY: "key-example",
      MAILGUN_DOMAIN: "unionops.org",
      MAILGUN_WEBHOOK_SIGNING_KEY: "webhook-signing-key-long-enough",
      EMAIL_ENABLED: "true",
    });
    expect(cfg.enabled).toBe(true);
  });
});

describe("outreach-list action links", () => {
  it("binds purpose and stores only a hash", () => {
    const now = Date.now();
    const issued = createOutreachListToken("confirm", new Date(now + 3600_000), [key]);
    expect(issued.hash).toBe(outreachListTokenHash(issued.token));
    expect(verifyOutreachListToken(issued.token, "confirm", [key], now)).toBe(issued.hash);
    expect(verifyOutreachListToken(issued.token, "unsubscribe", [key], now)).toBeNull();
  });
});
