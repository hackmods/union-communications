import type {
  ObservabilityEvent,
  ObservabilityEventInput,
  ObservabilityExportFormat,
  ObservabilityQueryFilters,
  ObservabilityStoreStats,
  ObservabilitySummary,
} from "@/lib/observability/types";

export type ObservabilityExportResult = {
  format: ObservabilityExportFormat;
  body: string | Buffer;
  eventCount: number;
  contentType: string;
  filename: string;
};

/**
 * Operator event store — append / query / export / summarize.
 * Postgres is Docker primary; file is fallback / dual-write.
 */
export interface ObservabilityEventStore {
  isEnabled(): boolean;

  append(event: ObservabilityEventInput): Promise<ObservabilityEvent | null>;

  query(filters?: ObservabilityQueryFilters): Promise<ObservabilityEvent[]>;

  summarize(filters?: ObservabilityQueryFilters): Promise<ObservabilitySummary>;

  stats(): Promise<ObservabilityStoreStats>;

  export(
    filters: ObservabilityQueryFilters | undefined,
    format: ObservabilityExportFormat,
  ): Promise<ObservabilityExportResult>;
}
