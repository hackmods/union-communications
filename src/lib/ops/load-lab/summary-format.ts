import type { LoadLabSummary } from "./types";

export function formatSummaryMarkdown(summary: LoadLabSummary): string {
  const lines: string[] = [
    `# UnionOps Capacity Test`,
    ``,
    `- Environment: ${summary.envName}`,
    `- Base URL: ${summary.baseUrl}`,
    `- Profile: ${summary.profile}`,
    `- Measurement: ${summary.measurementMode}`,
    `- Started: ${summary.startedAt}`,
    `- Finished: ${summary.finishedAt}`,
    `- Commit: ${summary.commit ?? "unknown"}`,
    `- Version: ${summary.version ?? "unknown"}`,
    ``,
    `## Capacity Summary`,
    ``,
    `| VUs | Req/s | p50 | p95 | p99 | Errors | Result |`,
    `|---:|---:|---:|---:|---:|---:|---|`,
  ];
  for (const t of summary.tiers) {
    if (t.verdict === "not_attempted") {
      lines.push(
        `| ${t.vus} | ? | ? | ? | ? | ? | not attempted${t.skipReason ? ` (${t.skipReason})` : ""} |`,
      );
      continue;
    }
    lines.push(
      `| ${t.vus} | ${t.reqPerSec.toFixed(1)} | ${Math.round(t.p50Ms)} | ${Math.round(t.p95Ms)} | ${Math.round(t.p99Ms)} | ${(t.errorRate * 100).toFixed(2)}% | ${t.verdict} |`,
    );
  }
  lines.push(
    ``,
    `## Finding`,
    ``,
    `- Last healthy tier: ${summary.lastHealthyVus ?? "none"}`,
    `- First degraded tier: ${summary.firstDegradedVus ?? "none"}`,
    `- First failed tier: ${summary.firstFailedVus ?? "none"}`,
    `- Approximate sustainable RPS: ${summary.sustainableReqPerSec?.toFixed(1) ?? "n/a"}`,
    ``,
    `## Hints`,
    ``,
  );
  for (const h of summary.hints) {
    lines.push(`- **${h.label}:** ${h.detail}`);
  }
  if (summary.aborted) {
    lines.push(``, `Aborted: ${summary.abortReason ?? "circuit breaker"}`);
  }
  lines.push(``);
  return lines.join("\n");
}

export function parseSummaryJson(raw: unknown): LoadLabSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<LoadLabSummary>;
  if (s.schemaVersion !== 1) return null;
  if (!Array.isArray(s.tiers) || typeof s.runId !== "string") return null;
  return s as LoadLabSummary;
}
