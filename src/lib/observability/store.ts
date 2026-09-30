import type { ObservabilityEventStore } from "@/lib/observability/adapter";
import {
  resolveObservabilityBackend,
  resolveObservabilityConfig,
  type EnvBag,
} from "@/lib/observability/config";
import { DualWriteObservabilityStore } from "@/lib/observability/dual-store";
import { FileObservabilityStore } from "@/lib/observability/file-store";
import { NoopObservabilityStore } from "@/lib/observability/noop-store";
import { PostgresObservabilityStore } from "@/lib/observability/postgres-store";

let store: ObservabilityEventStore | null = null;
let storeEnv: EnvBag | null = null;

function createStore(env: EnvBag): ObservabilityEventStore {
  const backend = resolveObservabilityBackend(env);
  const cfg = resolveObservabilityConfig(env);

  if (backend === "noop") {
    return new NoopObservabilityStore();
  }

  if (backend === "postgres") {
    const primary = new PostgresObservabilityStore();
    if (!primary.isEnabled()) {
      // Misconfigured postgres request — fall back to file if available.
      if (cfg.errorLogFileEnabled) {
        return new FileObservabilityStore(env);
      }
      return new NoopObservabilityStore();
    }
    if (cfg.fileDualWrite) {
      return new DualWriteObservabilityStore(
        primary,
        new FileObservabilityStore(env),
      );
    }
    return primary;
  }

  // file
  if (!cfg.errorLogFileEnabled || !cfg.errorLogFilePath) {
    return new NoopObservabilityStore();
  }
  return new FileObservabilityStore(env);
}

export function getObservabilityStore(env: EnvBag = process.env): ObservabilityEventStore {
  if (!store || storeEnv !== env) {
    store = createStore(env);
    storeEnv = env;
  }
  return store;
}

/** @internal test helper */
export function resetObservabilityStore(): void {
  store = null;
  storeEnv = null;
}

export const observabilityStore: ObservabilityEventStore = new Proxy(
  {} as ObservabilityEventStore,
  {
    get(_target, prop, receiver) {
      const impl = getObservabilityStore();
      const value = Reflect.get(impl as object, prop, receiver);
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(impl)
        : value;
    },
  },
);
