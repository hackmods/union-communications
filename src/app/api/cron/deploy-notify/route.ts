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

/**
 * Opt-in post-deploy operator email (host readiness summary).
 * Auth: Authorization Bearer / x-cron-secret = CRON_SECRET
 * Env: DEPLOY_NOTIFY_ENABLED=true + DEPLOY_NOTIFY_EMAIL + EMAIL_ENABLED
 *
 * GET|POST /api/cron/deploy-notify?dryRun=1
 */
async function handle(request: Request) {
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
  const payload = buildDeployNotifyPayload();
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
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
