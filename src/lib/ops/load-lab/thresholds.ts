/** Healthy / degraded / failed thresholds for dynamic requests. */

export type ThresholdConfig = {
  healthyErrorRate: number;
  healthyP95Ms: number;
  degradedP95Ms: number;
  failedErrorRate: number;
  failedP95Ms: number;
};

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  healthyErrorRate: 0.01,
  healthyP95Ms: 750,
  degradedP95Ms: 2000,
  failedErrorRate: 0.05,
  failedP95Ms: 3000,
};

export function classifyTier(
  errorRate: number,
  p95Ms: number,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS,
): "healthy" | "degraded" | "failed" {
  if (
    errorRate >= thresholds.failedErrorRate ||
    p95Ms >= thresholds.failedP95Ms
  ) {
    return "failed";
  }
  if (
    errorRate >= thresholds.healthyErrorRate ||
    p95Ms >= thresholds.healthyP95Ms
  ) {
    return "degraded";
  }
  return "healthy";
}

export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0]!;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1),
  );
  return sortedAsc[idx]!;
}
