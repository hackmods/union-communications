import type {
  ObservabilityEventStore,
  ObservabilityExportResult,
} from "@/lib/observability/adapter";
import type {
  ObservabilityEvent,
  ObservabilityExportFormat,
  ObservabilityQueryFilters,
} from "@/lib/observability/types";

/** No-op store when file sink is disabled or misconfigured. */
export class NoopObservabilityStore implements ObservabilityEventStore {
  isEnabled(): boolean {
    return false;
  }

  async append(): Promise<ObservabilityEvent | null> {
    return null;
  }

  async query(): Promise<ObservabilityEvent[]> {
    return [];
  }

  async export(
    _filters: ObservabilityQueryFilters | undefined,
    format: ObservabilityExportFormat,
  ): Promise<ObservabilityExportResult> {
    return {
      format,
      body: format === "csv" ? "id,ts,level,source,message\n" : "",
      eventCount: 0,
      contentType:
        format === "csv"
          ? "text/csv; charset=utf-8"
          : "application/x-ndjson; charset=utf-8",
      filename:
        format === "csv" ? "unionops-errors.csv" : "unionops-errors.jsonl",
    };
  }
}
