import type {
  ObservabilityEventStore,
  ObservabilityExportResult,
} from "@/lib/observability/adapter";
import type {
  ObservabilityEvent,
  ObservabilityEventInput,
  ObservabilityExportFormat,
  ObservabilityQueryFilters,
  ObservabilityStoreStats,
  ObservabilitySummary,
} from "@/lib/observability/types";

/**
 * Append to primary + optional secondary; query/export/summarize from primary.
 */
export class DualWriteObservabilityStore implements ObservabilityEventStore {
  constructor(
    private readonly primary: ObservabilityEventStore,
    private readonly secondary: ObservabilityEventStore | null,
  ) {}

  isEnabled(): boolean {
    return this.primary.isEnabled();
  }

  async append(event: ObservabilityEventInput): Promise<ObservabilityEvent | null> {
    const written = await this.primary.append(event);
    if (this.secondary?.isEnabled()) {
      try {
        await this.secondary.append(written ?? event);
      } catch {
        /* secondary is best-effort */
      }
    }
    return written;
  }

  query(filters?: ObservabilityQueryFilters): Promise<ObservabilityEvent[]> {
    return this.primary.query(filters);
  }

  summarize(filters?: ObservabilityQueryFilters): Promise<ObservabilitySummary> {
    return this.primary.summarize(filters);
  }

  stats(): Promise<ObservabilityStoreStats> {
    return this.primary.stats();
  }

  export(
    filters: ObservabilityQueryFilters | undefined,
    format: ObservabilityExportFormat,
  ): Promise<ObservabilityExportResult> {
    return this.primary.export(filters, format);
  }
}
