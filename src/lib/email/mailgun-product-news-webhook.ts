import { createHmac, timingSafeEqual } from "node:crypto";

type MailgunEvent = {
  id?: unknown;
  event?: unknown;
  severity?: unknown;
  message?: { headers?: { "message-id"?: unknown } };
  tags?: unknown;
};
type MailgunEnvelope = {
  signature?: { timestamp?: unknown; token?: unknown; signature?: unknown };
  "event-data"?: MailgunEvent;
};
export type ProductNewsProviderEvent = {
  id: string;
  messageId: string;
  type: "temporary_failure" | "permanent_failure" | "complained" | "unsubscribed";
};
export type VerifiedProductNewsWebhook = {
  authenticated: boolean;
  event: ProductNewsProviderEvent | null;
  lane: "product_news" | "member_broadcast" | "outreach_list" | null;
};

const MAILGUN_TAG_PRODUCT_NEWS = "unionops-product-news";
const MAILGUN_TAG_MEMBER_BROADCAST = "unionops-member-broadcast";
const MAILGUN_TAG_OUTREACH_LIST = "unionops-outreach-list";

function verifyMailgunSignature(
  envelope: MailgunEnvelope | null,
  signingKey: string,
): boolean {
  const signature = envelope?.signature;
  if (
    typeof signature?.timestamp !== "string" ||
    !/^\d{9,12}$/.test(signature.timestamp) ||
    typeof signature.token !== "string" ||
    signature.token.length < 20 ||
    signature.token.length > 100 ||
    typeof signature.signature !== "string" ||
    !/^[0-9a-f]{64}$/i.test(signature.signature)
  ) {
    return false;
  }
  const expected = createHmac("sha256", signingKey)
    .update(signature.timestamp + signature.token)
    .digest();
  const supplied = Buffer.from(signature.signature, "hex");
  return timingSafeEqual(expected, supplied);
}

function parseTaggedEvent(
  event: MailgunEvent | undefined,
  tag: string,
): ProductNewsProviderEvent | null {
  if (!Array.isArray(event?.tags) || !event.tags.includes(tag)) {
    return null;
  }
  const id = event?.id;
  const messageId = event?.message?.headers?.["message-id"];
  if (
    typeof id !== "string" ||
    id.length < 8 ||
    id.length > 160 ||
    typeof messageId !== "string" ||
    messageId.length < 8 ||
    messageId.length > 300
  ) {
    return null;
  }
  let type: ProductNewsProviderEvent["type"] | null = null;
  if (event?.event === "failed" && event.severity === "permanent") {
    type = "permanent_failure";
  } else if (event?.event === "failed" && event.severity === "temporary") {
    type = "temporary_failure";
  } else if (event?.event === "complained") {
    type = "complained";
  } else if (event?.event === "unsubscribed") {
    type = "unsubscribed";
  }
  return type ? { id, messageId, type } : null;
}

/** Verify Mailgun's timestamp+token HMAC before reading any event fields. */
export function parseVerifiedProductNewsWebhook(
  body: unknown,
  signingKey: string,
): VerifiedProductNewsWebhook {
  const invalid: VerifiedProductNewsWebhook = {
    authenticated: false,
    event: null,
    lane: null,
  };
  if (!signingKey) return invalid;
  const envelope = body as MailgunEnvelope | null;
  if (!verifyMailgunSignature(envelope, signingKey)) return invalid;
  const eventData = envelope?.["event-data"];
  const productNews = parseTaggedEvent(eventData, MAILGUN_TAG_PRODUCT_NEWS);
  if (productNews) {
    return { authenticated: true, event: productNews, lane: "product_news" };
  }
  const memberBroadcast = parseTaggedEvent(
    eventData,
    MAILGUN_TAG_MEMBER_BROADCAST,
  );
  if (memberBroadcast) {
    return {
      authenticated: true,
      event: memberBroadcast,
      lane: "member_broadcast",
    };
  }
  const outreachList = parseTaggedEvent(eventData, MAILGUN_TAG_OUTREACH_LIST);
  if (outreachList) {
    return {
      authenticated: true,
      event: outreachList,
      lane: "outreach_list",
    };
  }
  return { authenticated: true, event: null, lane: null };
}
