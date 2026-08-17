import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { canReadSiteFeedbackInbox } from "@/lib/platform-feedback/access";
import {
  resetMemoryPlatformFeedbackStore,
} from "@/lib/platform-feedback/memory-adapter";
import {
  checkFeedbackSubmitRateLimit,
  resetFeedbackSubmitRateLimit,
} from "@/lib/platform-feedback/rate-limit";
import { resolveFeedbackSource, toInboxItem } from "@/lib/platform-feedback/source";
import {
  platformFeedbackStore,
  resetPlatformFeedbackStore,
} from "@/lib/platform-feedback/store";
import { submitSiteFeedback } from "@/lib/platform-feedback/submit";
import { parseJsonBody } from "@/lib/validation/parse";
import { submitSiteFeedbackSchema } from "@/lib/validation/platform-feedback";

const validBody = {
  category: "idea" as const,
  body: "The flyer maker preview is hard to read on a small phone screen.",
  consentAccepted: true as const,
  locale: "en" as const,
};

describe("platform feedback access", () => {
  it("allows only platform_admin to read the inbox", () => {
    expect(canReadSiteFeedbackInbox(["platform_admin"])).toBe(true);
    expect(canReadSiteFeedbackInbox(["local_president"])).toBe(false);
    expect(canReadSiteFeedbackInbox(["local_steward"])).toBe(false);
    expect(canReadSiteFeedbackInbox([])).toBe(false);
  });
});

describe("resolveFeedbackSource", () => {
  it("stamps public when there is no session, even if the header is forged", () => {
    expect(
      resolveFeedbackSource({
        hasSession: false,
        surfaceHeader: "hub",
        referer: "https://example.test/app/send-feedback",
      }),
    ).toBe("public");
  });

  it("honors hub/portal headers only when signed in", () => {
    expect(
      resolveFeedbackSource({ hasSession: true, surfaceHeader: "hub" }),
    ).toBe("hub");
    expect(
      resolveFeedbackSource({ hasSession: true, surfaceHeader: "portal" }),
    ).toBe("portal");
    expect(
      resolveFeedbackSource({
        hasSession: true,
        referer: "https://example.test/en/feedback",
      }),
    ).toBe("public");
  });
});

describe("site feedback validation", () => {
  it("rejects identity and status fields on the public body", () => {
    const parsed = parseJsonBody(submitSiteFeedbackSchema, {
      ...validBody,
      userId: "forged",
      source: "hub",
      status: "done",
    });
    expect(parsed.ok).toBe(false);
  });

  it("rejects a short body", () => {
    const parsed = parseJsonBody(submitSiteFeedbackSchema, {
      ...validBody,
      body: "too short",
    });
    expect(parsed.ok).toBe(false);
  });
});

describe("platform feedback store + submit", () => {
  beforeEach(() => {
    resetMemoryPlatformFeedbackStore();
    resetPlatformFeedbackStore();
    resetFeedbackSubmitRateLimit();
    delete process.env.FEEDBACK_REQUIRE_DURABLE;
    delete process.env.FEEDBACK_NOTIFY_EMAIL;
  });

  afterEach(() => {
    resetMemoryPlatformFeedbackStore();
    resetPlatformFeedbackStore();
    resetFeedbackSubmitRateLimit();
  });

  it("creates, lists, updates status, and deletes", async () => {
    const created = await platformFeedbackStore.create(validBody, {
      source: "public",
      ipHash: "abc",
    });
    expect(created.status).toBe("new");
    expect(created.ipHash).toBe("abc");

    const listed = await platformFeedbackStore.list({ status: "new" });
    expect(listed).toHaveLength(1);

    const updated = await platformFeedbackStore.update(created.id, {
      status: "triaged",
      stewardNote: "Look at flyer preview",
    });
    expect(updated?.status).toBe("triaged");
    expect(updated?.stewardNote).toBe("Look at flyer preview");

    expect(toInboxItem(created).signedIn).toBe(false);
    expect("ipHash" in toInboxItem(created)).toBe(false);

    await expect(platformFeedbackStore.delete(created.id)).resolves.toBe(true);
    await expect(platformFeedbackStore.list()).resolves.toHaveLength(0);
  });

  it("does not persist a honeypot submission", async () => {
    const result = await submitSiteFeedback({
      raw: { ...validBody, website: "https://spam.example" },
      ip: "1.2.3.4",
    });
    expect(result.status).toBe(201);
    expect(result.body).toEqual({ ok: true });
    await expect(platformFeedbackStore.list()).resolves.toHaveLength(0);
  });

  it("stamps submitterUserId from session and ignores a missing client identity", async () => {
    const result = await submitSiteFeedback({
      raw: validBody,
      ip: "1.2.3.4",
      sessionUserId: "officer-1",
      surfaceHeader: "hub",
    });
    expect(result.status).toBe(201);
    const items = await platformFeedbackStore.list();
    expect(items[0]?.submitterUserId).toBe("officer-1");
    expect(items[0]?.source).toBe("hub");
  });

  it("rate-limits repeated submits from the same IP hash", () => {
    const hash = "rate-test";
    for (let i = 0; i < 5; i += 1) {
      expect(checkFeedbackSubmitRateLimit(hash)).toBe(true);
    }
    expect(checkFeedbackSubmitRateLimit(hash)).toBe(false);
  });
});
