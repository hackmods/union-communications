import { apiAdapter } from "./api-adapter";
import { DATA_ADAPTER_MODE_KEY, resolveDataAdapterMode } from "./adapter";
import type { DataAdapter } from "./adapter";
import { dataAdapter as localStorageAdapter } from "./local-storage-adapter";

/**
 * Resolves the active `DataAdapter` for the current browser. Defaults to
 * `LocalStorageAdapter` (Comms sovereignty); returns `ApiAdapter` only when
 * the user has explicitly opted in via the Hub settings preference — see
 * `DATA_ADAPTER_MODE_KEY` in `src/lib/data/adapter.ts`.
 */
export function getDataAdapter(): DataAdapter {
  if (typeof window === "undefined") return localStorageAdapter;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(DATA_ADAPTER_MODE_KEY);
  } catch {
    raw = null;
  }
  return resolveDataAdapterMode(raw) === "api"
    ? apiAdapter
    : localStorageAdapter;
}

export function setDataAdapterMode(mode: "local" | "api"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DATA_ADAPTER_MODE_KEY, mode);
  } catch (err) {
    console.warn("[getDataAdapter] failed to persist adapter mode", err);
  }
}
