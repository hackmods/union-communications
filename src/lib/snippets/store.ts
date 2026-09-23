import { snippetsDbBackend } from "@/lib/db/backend";
import { withTenantRlsScope } from "@/lib/db/rls-store";
import type { SnippetAdapter } from "./adapter";
import { DrizzleSnippetAdapter } from "./drizzle-adapter";
import { memorySnippetStore } from "./memory-adapter";

let store: SnippetAdapter | null = null;

/** Singleton CA-snippet store — memory by default; Postgres when flagged. */
export function getSnippetStore(): SnippetAdapter {
  if (!store) {
    store =
      snippetsDbBackend() === "postgres"
        ? withTenantRlsScope(new DrizzleSnippetAdapter())
        : memorySnippetStore;
  }
  return store;
}

/** @internal test helper */
export function resetSnippetStore(): void {
  store = null;
}

export const snippetStore: SnippetAdapter = new Proxy({} as SnippetAdapter, {
  get(_target, prop, receiver) {
    const impl = getSnippetStore();
    const value = Reflect.get(impl, prop, receiver);
    return typeof value === "function" ? value.bind(impl) : value;
  },
});
