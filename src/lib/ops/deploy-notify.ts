/**
 * Post-deploy operator email — env-gated, no member lists (ADR-016).
 */

import {
  buildHostReadiness,
  formatHostReadinessEmailBody,
} from "@/lib/ops/host-readiness";
import { buildHealthStatus } from "@/lib/ops/health-status";
import {
  isTransactionalEmailAvailable,
  sendTransactionalEmail,
} from "@/lib/email/send";

type EnvLike = Record<string, string | undefined>;

export function isDeployNotifyEnabled(
  env: EnvLike = process.env,
): boolean {
  const raw = env.DEPLOY_NOTIFY_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function readDeployNotifyEmail(
  env: EnvLike = process.env,
): string | null {
  const value = env.DEPLOY_NOTIFY_EMAIL?.trim();
  return value || null;
}

export type DeployNotifyPayload = {
  subject: string;
  text: string;
  commit: string;
  version: string;
  ready: boolean;
};

export function buildDeployNotifyPayload(
  health = buildHealthStatus(),
): DeployNotifyPayload {
  const readiness = buildHostReadiness(health);
  const short = readiness.image.commit.slice(0, 7);
  const subject = `UnionOps deploy ${short} — ${readiness.ready ? "ready" : "needs attention"}`;
  return {
    subject,
    text: formatHostReadinessEmailBody(readiness),
    commit: readiness.image.commit,
    version: readiness.image.version,
    ready: readiness.ready,
  };
}

export type DeployNotifySendResult =
  | { ok: true; skipped?: undefined; messageId?: string }
  | {
      ok: false;
      skipped: "disabled" | "no_recipient" | "email_unavailable" | "send_failed";
      error?: string;
    };

export async function sendDeployNotifyEmail(input?: {
  to?: string | null;
  payload?: DeployNotifyPayload;
}): Promise<DeployNotifySendResult & { payload: DeployNotifyPayload }> {
  const payload = input?.payload ?? buildDeployNotifyPayload();
  if (!isDeployNotifyEnabled()) {
    return { ok: false, skipped: "disabled", payload };
  }
  const to = (input?.to ?? readDeployNotifyEmail())?.trim();
  if (!to) {
    return { ok: false, skipped: "no_recipient", payload };
  }
  if (!isTransactionalEmailAvailable()) {
    return { ok: false, skipped: "email_unavailable", payload };
  }
  const result = await sendTransactionalEmail({
    to,
    subject: payload.subject,
    text: payload.text,
  });
  if (!result.ok) {
    return {
      ok: false,
      skipped: "send_failed",
      error: result.error,
      payload,
    };
  }
  return { ok: true, messageId: result.messageId, payload };
}
