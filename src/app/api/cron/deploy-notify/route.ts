import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertCronSecret,
  parseCronDryRun,
} from "@/lib/meetings/officer-reminder-cron";
import {
  buildDeployNotifyPayload,
  isDeployNotifyEnabled,
  readDeployNotifyEmail,
  sendDeployNotifyEmail,
} from "@/lib/ops/deploy-notify";
import { reportApiFailure } from "@/lib/observability/report-server-error";
import { autoAckIssuesOnDeploy } from "@/lib/observability/auto-ack-deploy";
import { withRlsContext } from "@/lib/db/rls-context";
import { isPostgresConfigured } from "@/lib/db/client";

/**
 * Opt-in post-deploy operator email (host readiness summary).
 * Auth: Authorization Bearer / x-cron-secret = CRON_SECRET
 * Env: OPS_NOTIFY_ON_DEPLOY=true (or DEPLOY_NOTIFY_ENABLED) + DEPLOY_NOTIFY_EMAIL + EMAIL_ENABLED
 * Optional: OBSERVABILITY_AUTO_ACK_ON_DEPLOY=true after a successful notify.
 * Successful sends update shared ops_boot_notify_state so boot does not re-mail.
 *
 * GET|POST /api/cron/deploy-notify?dryRun=1
 */
async function handle(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    const cronHeader = request.headers.get("x-cron-secret");
    if (
      !assertCronSecret(authHeader, secret) &&
      !assertCronSecret(cronHeader, secret)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const dryRun = parseCronDryRun(url.searchParams);
    const payload = await buildDeployNotifyPayload();
    const to = readDeployNotifyEmail();

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        enabled: isDeployNotifyEnabled(),
        to: to ? "(configured)" : null,
        ...payload,
      });
    }

    const result = await sendDeployNotifyEmail({ to, payload });

    await auditLog.log({
      userId: "system-cron",
      action: "email.deploy_notify",
      resourceType: "site_admin",
      resourceId: payload.commit || "*",
      metadata: {
        commit: payload.commit,
        version: payload.version,
        ready: payload.ready ? "true" : "false",
        ok: result.ok ? "true" : "false",
        skipped: "skipped" in result && result.skipped ? result.skipped : "",
      },
    });

    let autoAck: Awaited<ReturnType<typeof autoAckIssuesOnDeploy>> | null =
      null;
    if (result.ok) {
      const runAck = () => autoAckIssuesOnDeploy({ commit: payload.commit });
      autoAck = isPostgresConfigured()
        ? await withRlsContext({ retentionJob: true }, runAck)
        : await runAck();
    }

    if (!result.ok) {
      const status =
        result.skipped === "disabled" || result.skipped === "no_recipient"
          ? 200
          : result.skipped === "email_unavailable"
            ? 503
            : 502;
      return NextResponse.json(
        {
          ok: false,
          skipped: result.skipped,
          error: result.error,
          commit: payload.commit,
          version: payload.version,
          ready: payload.ready,
          autoAck,
        },
        { status },
      );
    }

    return NextResponse.json({
      ok: true,
      commit: payload.commit,
      version: payload.version,
      ready: payload.ready,
      messageId: result.messageId,
      autoAck,
    });
  } catch (error) {
    reportApiFailure(error, "/api/cron/deploy-notify", { source: "cron" });
    return NextResponse.json(
      { error: "Deploy notify cron failed" },
      { status: 503 },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
