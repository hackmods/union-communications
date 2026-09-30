import type {
  ObservabilityEventStore,
  ObservabilityExportResult,
} from "@/lib/observability/adapter";
import { buildObservabilityExport } from "@/lib/observability/export-formats";
import { summarizeEvents } from "@/lib/observability/summarize";
import type {
  ObservabilityEvent,
  ObservabilityEventInput,
  ObservabilityExportFormat,
  ObservabilityQueryFilters,
  ObservabilityStoreStats,
  ObservabilitySummary,
} from "@/lib/observability/types";

/** No-op store when no backend is configured. */
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

  async summarize(): Promise<ObservabilitySummary> {
    return summarizeEvents([]);
  }

  async stats(): Promise<ObservabilityStoreStats> {
    return {
      backend: "noop",
      eventCountEstimate: 0,
      fileBytes: null,
      rotatedFiles: null,
    };
  }

  async export(
    _filters: ObservabilityQueryFilters | undefined,
    format: ObservabilityExportFormat,
  ): Promise<ObservabilityExportResult> {
    return buildObservabilityExport([], format);
  }
}
