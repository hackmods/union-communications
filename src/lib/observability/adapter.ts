import type {
  ObservabilityEvent,
  ObservabilityEventInput,
  ObservabilityExportFormat,
  ObservabilityQueryFilters,
} from "@/lib/observability/types";

export type ObservabilityExportResult = {
  format: ObservabilityExportFormat;
  body: string;
  eventCount: number;
  contentType: string;
  filename: string;
};

/**
 * Operator event store — append / query / export.
 * File backend is v1; PostgresObservabilityStore is the enterprise upgrade path.
 */
export interface ObservabilityEventStore {
  /** True when append/query/export can succeed (backend configured). */
  isEnabled(): boolean;

  append(event: ObservabilityEventInput): Promise<ObservabilityEvent | null>;

  query(filters?: ObservabilityQueryFilters): Promise<ObservabilityEvent[]>;

  export(
    filters: ObservabilityQueryFilters | undefined,
    format: ObservabilityExportFormat,
  ): Promise<ObservabilityExportResult>;
}

/**
 * @future PostgresObservabilityStore — durable cross-replica query.
 * Map ObservabilityEvent 1:1 (id, ts, level, source, message, stack, …).
 * Flip via OBSERVABILITY_BACKEND=postgres once a migration lands.
 */
export type PostgresObservabilityStorePlaceholder = ObservabilityEventStore;
