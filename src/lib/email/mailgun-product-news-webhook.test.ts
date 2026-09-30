import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseVerifiedProductNewsWebhook } from "./mailgun-product-news-webhook";

const key = "mailgun-signing-key";
function signed(event: Record<string, unknown>) {
  const timestamp = "1790500000";
  const token = "0123456789abcdef0123456789abcdef0123456789abcdef01";
  return {
    signature: { timestamp, token, signature: createHmac("sha256", key).update(timestamp + token).digest("hex") },
    "event-data": event,
  };
}

describe("Mailgun product-news webhook", () => {
  it("accepts only authenticated tagged permanent failures", () => {
    const payload = signed({ id: "provider-event-1", event: "failed", severity: "permanent",
      tags: ["unionops-product-news"], message: { headers: { "message-id": "message-id-123@mailgun.org" } } });
    expect(parseVerifiedProductNewsWebhook(payload, key)).toEqual({
      authenticated: true,
      lane: "product_news",
      event: { id: "provider-event-1", messageId: "message-id-123@mailgun.org", type: "permanent_failure" },
    });
    expect(parseVerifiedProductNewsWebhook({ ...payload, signature: { ...payload.signature, signature: "0".repeat(64) } }, key).authenticated).toBe(false);
  });

  it("ignores authenticated transactional and tracking events", () => {
    const message = { headers: { "message-id": "message-id-123@mailgun.org" } };
    expect(parseVerifiedProductNewsWebhook(signed({ id: "provider-event-2", event: "complained", tags: [], message }), key))
      .toEqual({ authenticated: true, event: null, lane: null });
    expect(parseVerifiedProductNewsWebhook(signed({ id: "provider-event-3", event: "opened", tags: ["unionops-product-news"], message }), key))
      .toEqual({ authenticated: true, event: null, lane: null });
  });

  it("routes outreach-list tags to the outreach lane", () => {
    const message = { headers: { "message-id": "message-id-789@mailgun.org" } };
    expect(
      parseVerifiedProductNewsWebhook(
        signed({
          id: "provider-event-5",
          event: "unsubscribed",
          tags: ["unionops-outreach-list"],
          message,
        }),
        key,
      ),
    ).toEqual({
      authenticated: true,
      lane: "outreach_list",
      event: {
        id: "provider-event-5",
        messageId: "message-id-789@mailgun.org",
        type: "unsubscribed",
      },
    });
  });

  it("routes member-broadcast tags to the broadcast lane", () => {
    const message = { headers: { "message-id": "message-id-456@mailgun.org" } };
    expect(
      parseVerifiedProductNewsWebhook(
        signed({
          id: "provider-event-4",
          event: "complained",
          tags: ["unionops-member-broadcast"],
          message,
        }),
        key,
      ),
    ).toEqual({
      authenticated: true,
      lane: "member_broadcast",
      event: {
        id: "provider-event-4",
        messageId: "message-id-456@mailgun.org",
        type: "complained",
      },
    });
  });
});
