import { attachmentsDbBackend } from "@/lib/db/backend";
import type { DocumentAdapter } from "./adapter";
import { DrizzleDocumentAdapter } from "./drizzle-adapter";
import { MemoryDocumentAdapter } from "./memory-adapter";

let store: DocumentAdapter | null = null;

/** Singleton documents store — shares ATTACHMENTS_DB_BACKEND with attachment meta. */
export function getDocumentStore(): DocumentAdapter {
  if (!store) {
    store =
      attachmentsDbBackend() === "postgres"
        ? new DrizzleDocumentAdapter()
        : new MemoryDocumentAdapter();
  }
  return store;
}

/** @internal test helper */
export function resetDocumentStore(): void {
  store = null;
}

export const documentStore: DocumentAdapter = new Proxy({} as DocumentAdapter, {
  get(_target, prop, receiver) {
    const impl = getDocumentStore();
    const value = Reflect.get(impl, prop, receiver);
    return typeof value === "function" ? value.bind(impl) : value;
  },
});
