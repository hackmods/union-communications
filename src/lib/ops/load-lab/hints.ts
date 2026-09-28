import type { BottleneckHint, LoadLabSummary, TierResult } from "./types";

/**
 * HTTP-signal bottleneck hints only — never invent CPU/Postgres causes.
 */
export function buildBottleneckHints(summary: LoadLabSummary): BottleneckHint[] {
  const hints: BottleneckHint[] = [];
  const attempted = summary.tiers.filter((t) => t.verdict !== "not_attempted");

  if (attempted.length >= 2) {
    const prev = attempted[attempted.length - 2]!;
    const last = attempted[attempted.length - 1]!;
    const rpsFlat =
      last.reqPerSec <= prev.reqPerSec * 1.05 && last.vus > prev.vus;
    const p95Climb = last.p95Ms >= prev.p95Ms * 1.4;
    if (rpsFlat && p95Climb) {
      hints.push({
        id: "throughput-saturation",
        label: "Throughput saturation",
        detail:
          "Request rate stopped scaling while p95 latency rose — classic saturation cliff.",
      });
    }
  }

  const last = attempted[attempted.length - 1];
  if (last) {
    const timeoutShare =
      last.successful + last.failed > 0
        ? last.timeouts / (last.successful + last.failed)
        : 0;
    if (timeoutShare >= 0.05 || last.timeouts >= 10) {
      hints.push({
        id: "timeouts",
        label: "Timeouts / unavailability",
        detail: `${last.timeouts} timeouts observed at ${last.vus} VUs (${(timeoutShare * 100).toFixed(1)}% of requests).`,
      });
    }
    if (last.authFailures > 0) {
      hints.push({
        id: "auth-path",
        label: "Session / auth path",
        detail: `${last.authFailures} authentication failures in this run — check login and MFA settings for load-test accounts.`,
      });
    }

    const hot = hottestEndpoint(last);
    if (hot) {
      hints.push({
        id: "hot-endpoint",
        label: "Hot endpoint",
        detail: `${hot.name}: p95 ${Math.round(hot.p95Ms)} ms, error rate ${(hot.errorRate * 100).toFixed(1)}% (${hot.count} requests).`,
      });
    }
  }

  hints.push({
    id: "writes-not-measured",
    label: "DB write capacity not measured",
    detail:
      "Launch profiles are public browse and Hub read only. Write-heavy capacity is untested on this run.",
  });

  hints.push({
    id: "colocated",
    label: "On-box generator",
    detail:
      "Load ran on the same host as the app. Glance CapRover CPU/RAM and Postgres connections for the run window — this Lab does not claim infrastructure causes.",
  });

  return hints;
}

function hottestEndpoint(tier: TierResult) {
  if (!tier.endpoints.length) return null;
  return [...tier.endpoints].sort((a, b) => {
    const score = (e: typeof a) => e.p95Ms + e.errorRate * 5000;
    return score(b) - score(a);
  })[0]!;
}

export function summarizeCapacity(tiers: TierResult[]): {
  lastHealthyVus: number | null;
  firstDegradedVus: number | null;
  firstFailedVus: number | null;
  sustainableReqPerSec: number | null;
} {
  let lastHealthyVus: number | null = null;
  let firstDegradedVus: number | null = null;
  let firstFailedVus: number | null = null;
  let sustainableReqPerSec: number | null = null;

  for (const tier of tiers) {
    if (tier.verdict === "not_attempted") continue;
    if (tier.verdict === "healthy") {
      lastHealthyVus = tier.vus;
      sustainableReqPerSec = tier.reqPerSec;
    } else if (tier.verdict === "degraded" && firstDegradedVus == null) {
      firstDegradedVus = tier.vus;
    } else if (tier.verdict === "failed" && firstFailedVus == null) {
      firstFailedVus = tier.vus;
    }
  }

  return {
    lastHealthyVus,
    firstDegradedVus,
    firstFailedVus,
    sustainableReqPerSec,
  };
}
