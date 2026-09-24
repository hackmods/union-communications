import type { RlsSessionContext } from "@/lib/db/rls-context";
import { withRlsContext } from "@/lib/db/rls-context";

/**
 * Tenant-scoped operation wrapper for Postgres-backed store adapters
 * (SEC-003 / ADR-008).
 *
 * Store proxies in `*_BACKEND=postgres` mode pass the Drizzle adapter through
 * this decorator so tenant-scoped methods run inside `withRlsContext()` with
 * the RLS session GUCs set. Memory adapters skip it at the store creation site.
 *
 * Methods whose tenant scope is carried in their arguments (`list(filters)`,
 * `create(input, meta)`, `importLocalSlice(unionId, localId, ...)`) resolve the
 * context here — call sites need no changes. By-id methods carry no scope, so
 * call sites must wrap them in `withRlsContext(tenantCtxFromSession, ...)`
 * explicitly (see `src/lib/auth/*` helpers).
 */

type AnyAsyncFn = (...args: never[]) => Promise<unknown>;

function scopeFrom(x: unknown): RlsSessionContext | undefined {
  // Plain unionId string (resetUnion / reseedReferencePacks).
  if (typeof x === "string" && x.length > 0) {
    return { unionId: x };
  }
  if (!x || typeof x !== "object") return undefined;
  const record = x as { unionId?: unknown; localId?: unknown; crossLocal?: unknown };
  const unionId = record.unionId;
  if (typeof unionId !== "string" || unionId.length === 0) return undefined;
  const localId = typeof record.localId === "string" ? record.localId : undefined;
  return {
    unionId,
    localId,
    crossLocal: record.crossLocal === true,
  };
}

/** Method name → arg index that carries the tenant scope. */
const SCOPE_ARG: Record<string, number> = {
  list: 0,
  create: 1,
  importLocalSlice: 0,
  /** CA snippets — meta.unionId */
  bulkCreate: 1,
  /** CA snippets — unionId string */
  resetUnion: 0,
  reseedReferencePacks: 0,
  upsertSeedPacks: 0,
};

/**
 * Wrap `impl` so tenant-scoped methods execute under the RLS session context.
 * Non-scopeable methods pass through unchanged (they must be wrapped by the
 * caller with `withRlsContext`).
 */
export function withTenantRlsScope<T extends object>(impl: T): T {
  return new Proxy(impl, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      if (!(prop in SCOPE_ARG)) {
        return value.bind(target);
      }
      const argIndex = SCOPE_ARG[prop as string];
      return (...args: never[]) => {
        const ctx = scopeFrom(args[argIndex]);
        const run = () =>
          (value as AnyAsyncFn).apply(target, args) as Promise<unknown>;
        return ctx
          ? withRlsContext(ctx, () => run())
          : run();
      };
    },
  });
}