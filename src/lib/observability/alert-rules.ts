import type { ObservabilityLevel, ObservabilitySource } from "@/lib/observability/types";

export type ObservabilityAlertRuleLike = {
  id: string;
  name: string;
  enabled: boolean;
  minLevel: ObservabilityLevel;
  sources: ObservabilitySource[] | null;
  fingerprint: string | null;
  thresholdCount: number;
  windowMinutes: number;
  cooldownMinutes: number;
  recipients: string[];
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
  rule: Pick<ObservabilityAlertRuleLike, "minLevel" | "sources" | "fingerprint">,
  event: {
    level: ObservabilityLevel;
    source: ObservabilitySource;
    fingerprint?: string | null;
  },
): boolean {
  if (!levelMeetsMinimum(event.level, rule.minLevel)) return false;
  if (rule.sources && rule.sources.length > 0) {
    if (!rule.sources.includes(event.source)) return false;
  }
  if (rule.fingerprint) {
    if (event.fingerprint !== rule.fingerprint) return false;
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

export function isObservabilityAlertsEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env.OBSERVABILITY_ALERTS_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function defaultObservabilityAlertEmail(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const value = env.OBSERVABILITY_ALERT_EMAIL?.trim();
  return value || null;
}
