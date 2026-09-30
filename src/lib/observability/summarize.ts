import type {
  ObservabilityEvent,
  ObservabilityIssueSummary,
  ObservabilityLevel,
  ObservabilityQueryFilters,
  ObservabilitySource,
  ObservabilitySummary,
} from "@/lib/observability/types";
import { withFingerprint } from "@/lib/observability/fingerprint";

export function matchesObservabilityFilters(
  event: ObservabilityEvent,
  filters: ObservabilityQueryFilters,
): boolean {
  if (filters.since) {
    const sinceMs = Date.parse(filters.since);
    const tsMs = Date.parse(event.ts);
    if (Number.isFinite(sinceMs) && Number.isFinite(tsMs) && tsMs < sinceMs) {
      return false;
    }
  }
  if (filters.level && event.level !== filters.level) return false;
  if (
    filters.signal != null &&
    filters.signal !== "" &&
    event.signal !== filters.signal
  ) {
    return false;
  }
  if (filters.source && event.source !== filters.source) return false;
  if (filters.routePrefix) {
    if (!event.route || !event.route.startsWith(filters.routePrefix)) return false;
  }
  if (filters.fingerprint && event.fingerprint !== filters.fingerprint) {
    return false;
  }
  if (filters.unionId) {
    if (event.unionId !== filters.unionId) return false;
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    const hay = `${event.message} ${event.name ?? ""} ${event.route ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function summarizeEvents(
  events: ObservabilityEvent[],
  topN = 25,
): ObservabilitySummary {
  const byLevel: Record<ObservabilityLevel, number> = {
    error: 0,
    warn: 0,
    info: 0,
  };
  const bySource: Record<ObservabilitySource, number> = {
    server: 0,
    client: 0,
    cron: 0,
    edge: 0,
  };
  const groups = new Map<string, ObservabilityIssueSummary>();

  for (const raw of events) {
    const event = withFingerprint(raw);
    byLevel[event.level] += 1;
    bySource[event.source] += 1;
    const existing = groups.get(event.fingerprint);
    if (!existing) {
      groups.set(event.fingerprint, {
        fingerprint: event.fingerprint,
        count: 1,
        lastTs: event.ts,
        sampleMessage: event.message,
        level: event.level,
        route: event.route,
        source: event.source,
      });
    } else {
      existing.count += 1;
      if (Date.parse(event.ts) > Date.parse(existing.lastTs)) {
        existing.lastTs = event.ts;
        existing.sampleMessage = event.message;
        existing.level = event.level;
        existing.route = event.route;
        existing.source = event.source;
      }
    }
  }

  const byFingerprint = [...groups.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return Date.parse(b.lastTs) - Date.parse(a.lastTs);
  });

  return {
    total: events.length,
    byLevel,
    bySource,
    byFingerprint: byFingerprint.slice(0, topN),
  };
}

/** Resolve UI time presets to ISO since timestamps. */
export function resolveSincePreset(
  since: string | undefined,
  now = new Date(),
): string | undefined {
  if (!since) return undefined;
  const raw = since.trim().toLowerCase();
  const ms =
    raw === "1h"
      ? 60 * 60_000
      : raw === "24h"
        ? 24 * 60 * 60_000
        : raw === "7d"
          ? 7 * 24 * 60 * 60_000
          : null;
  if (ms != null) return new Date(now.getTime() - ms).toISOString();
  if (Number.isFinite(Date.parse(since))) return new Date(Date.parse(since)).toISOString();
  return undefined;
}
