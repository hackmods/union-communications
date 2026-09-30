import type {
  ObservabilityEvent,
  ObservabilityExportFormat,
  ObservabilitySummary,
} from "@/lib/observability/types";
import type { ObservabilityExportResult } from "@/lib/observability/adapter";
import { summarizeEvents } from "@/lib/observability/summarize";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function eventsToCsv(events: ObservabilityEvent[]): string {
  const header = [
    "id",
    "ts",
    "level",
    "source",
    "message",
    "name",
    "route",
    "signal",
    "build",
    "requestId",
    "digest",
    "fingerprint",
    "stack",
    "meta",
  ];
  const lines = [header.join(",")];
  for (const e of events) {
    lines.push(
      [
        e.id,
        e.ts,
        e.level,
        e.source,
        e.message,
        e.name ?? "",
        e.route ?? "",
        e.signal ?? "",
        e.build ?? "",
        e.requestId ?? "",
        e.digest ?? "",
        e.fingerprint ?? "",
        e.stack ?? "",
        e.meta ? JSON.stringify(e.meta) : "",
      ]
        .map((cell) => escapeCsv(String(cell)))
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function eventsToJsonl(events: ObservabilityEvent[]): string {
  return `${events.map((e) => JSON.stringify(e)).join("\n")}${events.length ? "\n" : ""}`;
}

function summaryToCsv(summary: ObservabilitySummary): string {
  const lines = ["fingerprint,count,lastTs,level,source,route,sampleMessage"];
  for (const issue of summary.byFingerprint) {
    lines.push(
      [
        issue.fingerprint,
        String(issue.count),
        issue.lastTs,
        issue.level,
        issue.source ?? "",
        issue.route ?? "",
        issue.sampleMessage,
      ]
        .map((cell) => escapeCsv(cell))
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

function buildReportText(summary: ObservabilitySummary, eventCount: number): string {
  const lines = [
    "UnionOps observability incident pack",
    `Generated: ${new Date().toISOString()}`,
    `Events exported: ${eventCount}`,
    `Total matched (summary window): ${summary.total}`,
    "",
    "By level:",
    `  error: ${summary.byLevel.error}`,
    `  warn: ${summary.byLevel.warn}`,
    `  info: ${summary.byLevel.info}`,
    "",
    "By source:",
    `  server: ${summary.bySource.server}`,
    `  client: ${summary.bySource.client}`,
    `  cron: ${summary.bySource.cron}`,
    `  edge: ${summary.bySource.edge}`,
    "",
    "Top issues:",
  ];
  for (const issue of summary.byFingerprint.slice(0, 15)) {
    lines.push(
      `  [${issue.count}×] ${issue.fingerprint} ${issue.level} ${issue.sampleMessage.slice(0, 120)}`,
    );
  }
  lines.push("");
  lines.push(
    "Treat this pack as incident-response data. Stacks may contain incidental personal data.",
  );
  return `${lines.join("\n")}\n`;
}

export async function buildObservabilityExport(
  events: ObservabilityEvent[],
  format: ObservabilityExportFormat,
): Promise<ObservabilityExportResult> {
  const summary = summarizeEvents(events);

  if (format === "csv") {
    return {
      format,
      body: eventsToCsv(events),
      eventCount: events.length,
      contentType: "text/csv; charset=utf-8",
      filename: "unionops-errors.csv",
    };
  }

  if (format === "jsonl") {
    return {
      format,
      body: eventsToJsonl(events),
      eventCount: events.length,
      contentType: "application/x-ndjson; charset=utf-8",
      filename: "unionops-errors.jsonl",
    };
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file("events.jsonl", eventsToJsonl(events));
  zip.file("summary.csv", summaryToCsv(summary));
  zip.file("report.txt", buildReportText(summary, events.length));
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return {
    format: "incident-pack",
    body: buffer,
    eventCount: events.length,
    contentType: "application/zip",
    filename: `unionops-incident-pack-${stamp}.zip`,
  };
}
