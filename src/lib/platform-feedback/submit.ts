import { auditLog } from "@/lib/audit/store";
import { sendTransactionalEmail } from "@/lib/email/send";
import {
  feedbackRequireDurable,
  isFeedbackMemoryBackend,
} from "@/lib/platform-feedback/durable";
import {
  checkFeedbackSubmitRateLimit,
  hashFeedbackClientIp,
} from "@/lib/platform-feedback/rate-limit";
import { resolveFeedbackSource } from "@/lib/platform-feedback/source";
import { platformFeedbackStore } from "@/lib/platform-feedback/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { submitSiteFeedbackSchema } from "@/lib/validation/platform-feedback";
import type { CreateSiteFeedbackInput } from "@/types/platform-feedback";

export type SubmitSiteFeedbackResult =
  | { status: 201; body: { ok: true; id?: string } }
  | { status: 400 | 429 | 503; body: { error: string; issues?: unknown } };

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

async function notifyOperator(opts: {
  id: string;
  category: string;
  source: string;
}): Promise<void> {
  const to = process.env.FEEDBACK_NOTIFY_EMAIL?.trim();
  if (!to) return;
  const result = await sendTransactionalEmail({
    to,
    subject: `UnionOps site feedback (${opts.category})`,
    text: `A new site-feedback note arrived (${opts.source}). Open the steward inbox to read it. id=${opts.id}`,
  });
  await auditLog.log({
    userId: "system",
    action: result.ok ? "feedback.notify" : "feedback.notify_skipped",
    resourceType: "platform_feedback",
    resourceId: opts.id,
    metadata: {
      reason: result.ok ? "sent" : result.reason,
    },
  });
}

export async function submitSiteFeedback(opts: {
  raw: unknown;
  ip: string;
  sessionUserId?: string;
  surfaceHeader?: string | null;
  referer?: string | null;
}): Promise<SubmitSiteFeedbackResult> {
  if (feedbackRequireDurable() && isFeedbackMemoryBackend()) {
    return {
      status: 503,
      body: {
        error:
          "This host is not storing site feedback right now. Try GitHub issues, or ask the operator to enable lasting storage.",
      },
    };
  }

  const ipHash = hashFeedbackClientIp(opts.ip);
  if (!checkFeedbackSubmitRateLimit(ipHash)) {
    return {
      status: 429,
      body: { error: "Too many submissions. Try again in a few minutes." },
    };
  }

  const parsed = parseJsonBody(submitSiteFeedbackSchema, opts.raw);
  if (!parsed.ok) {
    return {
      status: 400,
      body: { error: "Validation failed", issues: parsed.issues },
    };
  }

  const data = parsed.data;
  if (data.website && data.website.trim().length > 0) {
    return { status: 201, body: { ok: true } };
  }

  const input: CreateSiteFeedbackInput = {
    category: data.category,
    body: data.body,
    pagePath: emptyToUndefined(data.pagePath),
    locale: data.locale === "fr" ? "fr" : "en",
    contactEmail: emptyToUndefined(data.contactEmail),
    contactName: emptyToUndefined(data.contactName),
  };

  const source = resolveFeedbackSource({
    hasSession: Boolean(opts.sessionUserId),
    surfaceHeader: opts.surfaceHeader,
    referer: opts.referer,
  });

  const row = await platformFeedbackStore.create(input, {
    source,
    submitterUserId: opts.sessionUserId,
    ipHash,
  });

  await auditLog.log({
    userId: opts.sessionUserId ?? "anonymous",
    action: "feedback.submit",
    resourceType: "platform_feedback",
    resourceId: row.id,
    metadata: { source, category: row.category },
  });

  void notifyOperator({
    id: row.id,
    category: row.category,
    source,
  });

  return { status: 201, body: { ok: true, id: row.id } };
}
