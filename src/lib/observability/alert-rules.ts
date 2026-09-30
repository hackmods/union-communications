import type { ObservabilityLevel, ObservabilitySource } from "@/lib/observability/types";

export type ObservabilityEmailFormat = "multipart" | "plain";

export type ObservabilityAlertRuleLike = {
  id: string;
  name: string;
  enabled: boolean;
  minLevel: ObservabilityLevel;
  sources: ObservabilitySource[] | null;
  fingerprint: string | null;
  /** Null = host-wide; set = only events with this union stamp. */
  unionId: string | null;
  thresholdCount: number;
  windowMinutes: number;
  cooldownMinutes: number;
  recipients: string[];
  /** Per-union recipient override map for host-wide rules. */
  recipientsByUnion: Record<string, string[]> | null;
  emailFormat: ObservabilityEmailFormat;
};

const LEVEL_RANK: Record<ObservabilityLevel, number> = {
  info: 0,
  warn: 1,
  error: 2,
};

export function levelMeetsMinimum(
  eventLevel: ObservabilityLevel,
  minLevel: ObservabilityLevel,
): boolean {
  return LEVEL_RANK[eventLevel] >= LEVEL_RANK[minLevel];
}

export function ruleMatchesEvent(
  rule: Pick<
    ObservabilityAlertRuleLike,
    "minLevel" | "sources" | "fingerprint" | "unionId"
  >,
  event: {
    level: ObservabilityLevel;
    source: ObservabilitySource;
    fingerprint?: string | null;
    unionId?: string | null;
  },
): boolean {
  if (!levelMeetsMinimum(event.level, rule.minLevel)) return false;
  if (rule.sources && rule.sources.length > 0) {
    if (!rule.sources.includes(event.source)) return false;
  }
  if (rule.fingerprint) {
    if (event.fingerprint !== rule.fingerprint) return false;
  }
  if (rule.unionId) {
    if (event.unionId !== rule.unionId) return false;
  }
  return true;
}

export function isWithinCooldown(
  lastFiredAt: Date | string | null | undefined,
  cooldownMinutes: number,
  now = new Date(),
): boolean {
  if (!lastFiredAt) return false;
  const ms =
    lastFiredAt instanceof Date
      ? lastFiredAt.getTime()
      : Date.parse(String(lastFiredAt));
  if (!Number.isFinite(ms)) return false;
  return now.getTime() - ms < cooldownMinutes * 60_000;
}

export function shouldFireAlert(input: {
  matchingCount: number;
  thresholdCount: number;
  lastFiredAt?: Date | string | null;
  cooldownMinutes: number;
  now?: Date;
}): boolean {
  if (input.matchingCount < input.thresholdCount) return false;
  if (isWithinCooldown(input.lastFiredAt, input.cooldownMinutes, input.now)) {
    return false;
  }
  return true;
}

/**
 * Resolve recipient buckets for a matching event set.
 * Host-wide rules fan out per distinct union using recipientsByUnion,
 * falling back to rule.recipients for null/unmapped unions.
 */
export function resolveRecipientBuckets(input: {
  rule: Pick<
    ObservabilityAlertRuleLike,
    "unionId" | "recipients" | "recipientsByUnion"
  >;
  eventUnionIds: Array<string | null | undefined>;
}): Array<{ unionId: string | null; recipients: string[] }> {
  if (input.rule.unionId) {
    return [
      {
        unionId: input.rule.unionId,
        recipients: [...input.rule.recipients],
      },
    ];
  }

  const map = input.rule.recipientsByUnion;
  if (!map || Object.keys(map).length === 0) {
    return [{ unionId: null, recipients: [...input.rule.recipients] }];
  }

  const buckets = new Map<string | null, string[]>();
  const seen = new Set<string | null>();
  for (const raw of input.eventUnionIds) {
    const key = raw?.trim() || null;
    if (seen.has(key)) continue;
    seen.add(key);
    const override = key && map[key]?.length ? map[key] : input.rule.recipients;
    buckets.set(key, [...override]);
  }
  if (buckets.size === 0) {
    return [{ unionId: null, recipients: [...input.rule.recipients] }];
  }
  return [...buckets.entries()].map(([unionId, recipients]) => ({
    unionId,
    recipients,
  }));
}

export function isObservabilityAlertsEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env.OBSERVABILITY_ALERTS_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function isObservabilityAutoAckOnDeploy(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env.OBSERVABILITY_AUTO_ACK_ON_DEPLOY?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function defaultObservabilityAlertEmail(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const value = env.OBSERVABILITY_ALERT_EMAIL?.trim();
  return value || null;
}
