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
};

/** Verify Mailgun's timestamp+token HMAC before reading any event fields. */
export function parseVerifiedProductNewsWebhook(body: unknown, signingKey: string): VerifiedProductNewsWebhook {
  const invalid = { authenticated: false, event: null };
  if (!signingKey) return invalid;
  const envelope = body as MailgunEnvelope | null;
  const signature = envelope?.signature;
  if (typeof signature?.timestamp !== "string" || !/^\d{9,12}$/.test(signature.timestamp)
    || typeof signature.token !== "string" || signature.token.length < 20 || signature.token.length > 100
    || typeof signature.signature !== "string" || !/^[0-9a-f]{64}$/i.test(signature.signature)) return invalid;
  const expected = createHmac("sha256", signingKey).update(signature.timestamp + signature.token).digest();
  const supplied = Buffer.from(signature.signature, "hex");
  if (!timingSafeEqual(expected, supplied)) return invalid;
  const event = envelope?.["event-data"];
  if (!Array.isArray(event?.tags) || !event.tags.includes("unionops-product-news")) {
    return { authenticated: true, event: null };
  }
  const id = event?.id;
  const messageId = event?.message?.headers?.["message-id"];
  if (typeof id !== "string" || id.length < 8 || id.length > 160
    || typeof messageId !== "string" || messageId.length < 8 || messageId.length > 300) {
    return { authenticated: true, event: null };
  }
  let type: ProductNewsProviderEvent["type"] | null = null;
  if (event?.event === "failed" && event.severity === "permanent") type = "permanent_failure";
  else if (event?.event === "failed" && event.severity === "temporary") type = "temporary_failure";
  else if (event?.event === "complained") type = "complained";
  else if (event?.event === "unsubscribed") type = "unsubscribed";
  return { authenticated: true, event: type ? { id, messageId, type } : null };
}
