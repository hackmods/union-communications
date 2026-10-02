/**
 * Post-deploy operator email — env-gated, no member lists (ADR-016).
 * Deploy gate: OPS_NOTIFY_ON_DEPLOY or legacy DEPLOY_NOTIFY_ENABLED.
 */

import {
  buildHostReadiness,
  formatHostReadinessEmailBody,
} from "@/lib/ops/host-readiness";
import {
  buildHealthStatus,
  type HealthStatus,
} from "@/lib/ops/health-status";
import {
  isOpsNotifyOnDeploy,
  readDeployNotifyEmail,
  recordDeployNotifySuccess,
} from "@/lib/ops/boot-notify";
import {
  isTransactionalEmailAvailable,
  sendTransactionalEmail,
} from "@/lib/email/send";

export { isOpsNotifyOnDeploy, readDeployNotifyEmail };

/** @deprecated Prefer isOpsNotifyOnDeploy — alias for backward-compatible imports. */
export function isDeployNotifyEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return isOpsNotifyOnDeploy(env);
}

export type DeployNotifyPayload = {
  subject: string;
  text: string;
  commit: string;
  version: string;
  ready: boolean;
};

export async function buildDeployNotifyPayload(
  health?: HealthStatus,
): Promise<DeployNotifyPayload> {
  const resolved = health ?? (await buildHealthStatus());
  const readiness = buildHostReadiness(resolved);
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
  const payload = input?.payload ?? (await buildDeployNotifyPayload());
  if (!isOpsNotifyOnDeploy()) {
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
  try {
    await recordDeployNotifySuccess({ commit: payload.commit });
  } catch (error) {
    console.warn(
      "[deploy-notify] failed to persist last deploy commit after send",
      error,
    );
  }
  return { ok: true, messageId: result.messageId, payload };
}
