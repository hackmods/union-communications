import { composeObservabilityCrisisAlert } from "@/lib/email/engine/compose-observability-alert";
import { sendClassifiedEmail } from "@/lib/email/send";
import { auditLog } from "@/lib/audit/store";
import {
  isObservabilityAlertsEnabled,
  resolveRecipientBuckets,
  shouldFireAlert,
} from "@/lib/observability/alert-rules";
import {
  aggregateMatchingRows,
  collectMatchingIssuesForRule,
  getLastAlertFiring,
  listEnabledObservabilityAlertRules,
  recordAlertFiring,
  type MatchingIssueSample,
} from "@/lib/observability/alert-store";
import { listObservabilityAcks } from "@/lib/observability/acks";
import { observabilityStore } from "@/lib/observability/store";
import { isPostgresConfigured } from "@/lib/db/client";
import { resolvePublicOrigin } from "@/lib/seo/public-origin";
import type { ObservabilityEvent } from "@/lib/observability/types";

export type EvaluateAlertsResult = {
  skipped?: "disabled" | "store_disabled";
  ruleCount: number;
  fired: Array<{
    ruleId: string;
    name: string;
    unionId: string | null;
    eventCount: number;
    recipients: number;
    messageId?: string;
    dryRun?: boolean;
  }>;
  skippedRules: Array<{
    ruleId: string;
    reason: string;
    eventCount?: number;
    unionId?: string | null;
  }>;
};

async function collectViaStore(
  rule: Awaited<ReturnType<typeof listEnabledObservabilityAlertRules>>[number],
  now: Date,
): Promise<{
  eventCount: number;
  issues: MatchingIssueSample[];
  eventUnionIds: Array<string | null>;
}> {
  if (isPostgresConfigured()) {
    return collectMatchingIssuesForRule(rule, now);
  }
  const since = new Date(
    now.getTime() - rule.windowMinutes * 60_000,
  ).toISOString();
  const events = await observabilityStore.query({
    since,
    limit: 500,
    ...(rule.fingerprint ? { fingerprint: rule.fingerprint } : {}),
    ...(rule.unionId ? { unionId: rule.unionId } : {}),
    ...(rule.minLevel === "error" ? { level: "error" as const } : {}),
  });
  const acks = await listObservabilityAcks();
  const acked = new Set(acks.map((a) => a.fingerprint));
  const filtered = events.filter((e: ObservabilityEvent) => {
    if (rule.sources?.length && !rule.sources.includes(e.source)) return false;
    return true;
  });
  return aggregateMatchingRows(
    filtered.map((e) => ({
      fingerprint: e.fingerprint ?? "unknown__",
      level: e.level,
      message: e.message,
      unionId: e.unionId ?? null,
      source: e.source,
    })),
    rule,
    acked,
  );
}

/**
 * Shared alert evaluator for Postgres and file-backed stores.
 */
export async function evaluateObservabilityAlerts(input: {
  dryRun?: boolean;
  now?: Date;
}): Promise<EvaluateAlertsResult> {
  const dryRun = Boolean(input.dryRun);
  const now = input.now ?? new Date();

  if (!isObservabilityAlertsEnabled()) {
    return { skipped: "disabled", ruleCount: 0, fired: [], skippedRules: [] };
  }
  if (!observabilityStore.isEnabled()) {
    return {
      skipped: "store_disabled",
      ruleCount: 0,
      fired: [],
      skippedRules: [],
    };
  }

  const origin =
    resolvePublicOrigin({ authUrl: process.env.AUTH_URL }) ??
    "https://unionops.org";
  const consoleUrl = `${origin}/en/app/site-admin/observability`;

  const rules = await listEnabledObservabilityAlertRules();
  const fired: EvaluateAlertsResult["fired"] = [];
  const skippedRules: EvaluateAlertsResult["skippedRules"] = [];

  for (const rule of rules) {
    if (!rule.recipients.length && !rule.recipientsByUnion) {
      skippedRules.push({ ruleId: rule.id, reason: "no_recipients" });
      continue;
    }

    const { eventCount, issues, eventUnionIds } = await collectViaStore(
      rule,
      now,
    );
    const buckets = resolveRecipientBuckets({
      rule,
      eventUnionIds,
    });

    for (const bucket of buckets) {
      if (!bucket.recipients.length) {
        skippedRules.push({
          ruleId: rule.id,
          reason: "no_recipients",
          unionId: bucket.unionId,
          eventCount,
        });
        continue;
      }

      const bucketIssues =
        bucket.unionId == null
          ? issues
          : issues.filter((i) => (i.unionId ?? null) === bucket.unionId);
      const bucketCount =
        bucket.unionId == null
          ? eventCount
          : bucketIssues.reduce((n, i) => n + i.count, 0);

      const last = await getLastAlertFiring(rule.id, bucket.unionId);
      if (
        !shouldFireAlert({
          matchingCount: bucketCount,
          thresholdCount: rule.thresholdCount,
          lastFiredAt: last?.firedAt,
          cooldownMinutes: rule.cooldownMinutes,
          now,
        })
      ) {
        skippedRules.push({
          ruleId: rule.id,
          reason:
            bucketCount < rule.thresholdCount ? "below_threshold" : "cooldown",
          eventCount: bucketCount,
          unionId: bucket.unionId,
        });
        continue;
      }

      if (dryRun) {
        fired.push({
          ruleId: rule.id,
          name: rule.name,
          unionId: bucket.unionId,
          eventCount: bucketCount,
          recipients: bucket.recipients.length,
          dryRun: true,
        });
        continue;
      }

      const artifact = composeObservabilityCrisisAlert({
        ruleName: rule.name,
        minLevel: rule.minLevel,
        eventCount: bucketCount,
        windowMinutes: rule.windowMinutes,
        issues: bucketIssues,
        consoleUrl,
        locale: "en",
        format: rule.emailFormat,
        unionId: bucket.unionId,
      });

      let lastMessageId: string | undefined;
      let sendOk = false;
      for (const to of bucket.recipients) {
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
        skippedRules.push({
          ruleId: rule.id,
          reason: "email_unavailable",
          eventCount: bucketCount,
          unionId: bucket.unionId,
        });
        continue;
      }

      await recordAlertFiring({
        ruleId: rule.id,
        fingerprint: rule.fingerprint,
        unionId: bucket.unionId,
        eventCount: bucketCount,
        messageId: lastMessageId,
      });

      await auditLog.log({
        userId: "system-cron",
        action: "observability.alert.fired",
        resourceType: "site_admin",
        resourceId: rule.id,
        metadata: {
          eventCount: String(bucketCount),
          recipients: String(bucket.recipients.length),
          minLevel: rule.minLevel,
          unionId: bucket.unionId ?? "",
        },
      });

      fired.push({
        ruleId: rule.id,
        name: rule.name,
        unionId: bucket.unionId,
        eventCount: bucketCount,
        recipients: bucket.recipients.length,
        messageId: lastMessageId,
      });
    }
  }

  return { ruleCount: rules.length, fired, skippedRules };
}
