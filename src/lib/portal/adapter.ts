import { portalStore, type MemoryPortalAdapter } from "@/lib/portal/memory-adapter";
import { portalDbBackend } from "@/lib/db/backend";
import type { RlsSessionContext } from "@/lib/db/rls-context";

type AsyncMethod<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => Promise<Awaited<R>>
  : T;

/** Async route/store contract shared by memory and Postgres implementations. */
export type PortalAdapter = {
  [K in keyof MemoryPortalAdapter]: AsyncMethod<MemoryPortalAdapter[K]>;
};

function asAsyncAdapter<T extends object>(store: T): T {
  return new Proxy(store, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver) as unknown;
      if (typeof value !== "function") return value;
      return (...args: unknown[]) =>
        Promise.resolve(Reflect.apply(value, target, args));
    },
  });
}

/** Async facade for the memory adapter; the underlying store remains sync for existing fixtures. */
export const memoryPortalAdapter = asAsyncAdapter(
  portalStore,
) as unknown as PortalAdapter;

/** Resolve the Portal store used by API and service code. */
export async function getPortalAdapter(scope?: RlsSessionContext): Promise<PortalAdapter> {
  if (portalDbBackend() === "postgres") {
    if (!scope?.unionId || !scope.userId) {
      throw new Error("Portal Postgres adapter requires a resolved actor scope.");
    }
    const { PostgresPortalAdapter } = await import("@/lib/portal/postgres-adapter");
    return new PostgresPortalAdapter(scope);
  }
  return memoryPortalAdapter;
}

/** Exposed for adapter contract tests; production callers should use the selector. */
export function portalAdapterForMemoryTests(): PortalAdapter {
  return memoryPortalAdapter;
}
