import { withTenantRlsScope } from "@/lib/db/rls-store";
import {
  accessRequestDbBackend as resolveAccessRequestBackend,
  type DbBackend,
} from "@/lib/db/backend";
import type { AccessRequestAdapter } from "./adapter";
import { DrizzleAccessRequestAdapter } from "./drizzle-adapter";
import { memoryAccessRequestStore } from "./memory-adapter";

let store: AccessRequestAdapter | null = null;

/** Prefer Postgres when DATABASE_URL is set; memory only as an explicit demo opt-out. */
export function accessRequestDbBackend(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): DbBackend {
  return resolveAccessRequestBackend(env);
}

export function getAccessRequestStore() {
  if (!store) {
    store =
      accessRequestDbBackend() === "postgres"
        ? withTenantRlsScope(new DrizzleAccessRequestAdapter())
        : memoryAccessRequestStore;
  }
  return store;
}

export const accessRequestStore = new Proxy({} as AccessRequestAdapter, {
  get(_t, p, r) {
    const impl = getAccessRequestStore();
    const v = Reflect.get(impl, p, r);
    return typeof v === "function" ? v.bind(impl) : v;
  },
});

export const isAccessRequestDurable = (
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) => accessRequestDbBackend(env) === "postgres";

/** Test helper — drop the cached adapter so env flips take effect. */
export function resetAccessRequestStoreCache() {
  store = null;
}
