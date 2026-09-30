import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { withRlsContext } from "@/lib/db/rls-context";
import { isPostgresConfigured } from "@/lib/db/client";
import { composeObservabilityCrisisAlert } from "@/lib/email/engine/compose-observability-alert";
import { sendClassifiedEmail } from "@/lib/email/send";
import {
  assertCronSecret,
  parseCronDryRun,
} from "@/lib/meetings/officer-reminder-cron";
import {
  isObservabilityAlertsEnabled,
  shouldFireAlert,
} from "@/lib/observability/alert-rules";
import {
  collectMatchingIssuesForRule,
  getLastAlertFiring,
  listEnabledObservabilityAlertRules,
  recordAlertFiring,
} from "@/lib/observability/alert-store";
import { reportApiFailure } from "@/lib/observability/report-server-error";
import { resolvePublicOrigin } from "@/lib/seo/public-origin";

export const runtime = "nodejs";

/**
 * Evaluate observability alert rules and send security-classified crisis mail.
 * Auth: Authorization Bearer / x-cron-secret = CRON_SECRET
 * Env: OBSERVABILITY_ALERTS_ENABLED=true + EMAIL_ENABLED + Postgres
 *
 * GET|POST /api/cron/observability-alerts?dryRun=1
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
    const enabled = isObservabilityAlertsEnabled();

    if (!enabled) {
      return NextResponse.json({
        ok: true,
        skipped: "disabled",
        dryRun,
      });
    }

    if (!isPostgresConfigured()) {
      return NextResponse.json({
        ok: true,
        skipped: "no_postgres",
        dryRun,
      });
    }

    const origin =
      resolvePublicOrigin({ authUrl: process.env.AUTH_URL }) ??
      "https://unionops.org";
    const consoleUrl = `${origin}/en/app/site-admin/observability`;

    const summary = await withRlsContext({ retentionJob: true }, async () => {
      const rules = await listEnabledObservabilityAlertRules();
      const fired: Array<{
        ruleId: string;
        name: string;
        eventCount: number;
        recipients: number;
        messageId?: string;
        dryRun?: boolean;
      }> = [];
      const skipped: Array<{
        ruleId: string;
        reason: string;
        eventCount?: number;
      }> = [];

      for (const rule of rules) {
        if (!rule.recipients.length) {
          skipped.push({ ruleId: rule.id, reason: "no_recipients" });
          continue;
        }

        const { eventCount, issues } = await collectMatchingIssuesForRule(rule);
        const last = await getLastAlertFiring(rule.id);
        if (
          !shouldFireAlert({
            matchingCount: eventCount,
            thresholdCount: rule.thresholdCount,
            lastFiredAt: last?.firedAt,
            cooldownMinutes: rule.cooldownMinutes,
          })
        ) {
          skipped.push({
            ruleId: rule.id,
            reason:
              eventCount < rule.thresholdCount
                ? "below_threshold"
                : "cooldown",
            eventCount,
          });
          continue;
        }

        if (dryRun) {
          fired.push({
            ruleId: rule.id,
            name: rule.name,
            eventCount,
            recipients: rule.recipients.length,
            dryRun: true,
          });
          continue;
        }

        const artifact = composeObservabilityCrisisAlert({
          ruleName: rule.name,
          minLevel: rule.minLevel,
          eventCount,
          windowMinutes: rule.windowMinutes,
          issues,
          consoleUrl,
          locale: "en",
        });

        let lastMessageId: string | undefined;
        let sendOk = false;
        for (const to of rule.recipients) {
          const result = await sendClassifiedEmail({
            classification: "security",
            to,
            subject: artifact.subject,
            text: artifact.text,
            html: artifact.html,
          });
          if (result.ok) {
            sendOk = true;
            lastMessageId = result.messageId ?? lastMessageId;
          }
        }

        if (!sendOk) {
          skipped.push({
            ruleId: rule.id,
            reason: "email_unavailable",
            eventCount,
          });
          continue;
        }

        await recordAlertFiring({
          ruleId: rule.id,
          fingerprint: rule.fingerprint,
          eventCount,
          messageId: lastMessageId,
        });

        await auditLog.log({
          userId: "system-cron",
          action: "observability.alert.fired",
          resourceType: "site_admin",
          resourceId: rule.id,
          metadata: {
            eventCount: String(eventCount),
            recipients: String(rule.recipients.length),
            minLevel: rule.minLevel,
          },
        });

        fired.push({
          ruleId: rule.id,
          name: rule.name,
          eventCount,
          recipients: rule.recipients.length,
          messageId: lastMessageId,
        });
      }

      return { ruleCount: rules.length, fired, skipped };
    });

    return NextResponse.json({
      ok: true,
      dryRun,
      ...summary,
    });
  } catch (error) {
    reportApiFailure(error, "/api/cron/observability-alerts", {
      source: "cron",
    });
    return NextResponse.json(
      { error: "Observability alerts cron failed" },
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
