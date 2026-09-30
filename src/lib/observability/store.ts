import type { ObservabilityEventStore } from "@/lib/observability/adapter";
import {
  resolveObservabilityBackend,
  resolveObservabilityConfig,
  type EnvBag,
} from "@/lib/observability/config";
import { FileObservabilityStore } from "@/lib/observability/file-store";
import { NoopObservabilityStore } from "@/lib/observability/noop-store";

let store: ObservabilityEventStore | null = null;
let storeEnv: EnvBag | null = null;

function createStore(env: EnvBag): ObservabilityEventStore {
  const backend = resolveObservabilityBackend(env);
  const cfg = resolveObservabilityConfig(env);

  if (backend === "noop" || !cfg.errorLogFileEnabled || !cfg.errorLogFilePath) {
    return new NoopObservabilityStore();
  }

  // `postgres` is reserved — fall back to file until a durable adapter ships.
  if (backend === "postgres") {
    console.warn(
      "[observability] OBSERVABILITY_BACKEND=postgres is not implemented yet; using file store",
    );
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
