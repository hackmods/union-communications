import { auditDbBackend } from "@/lib/db/backend";
import type { AuditLogAdapter } from "./adapter";
import { DrizzleAuditLogAdapter } from "./drizzle-adapter";
import { MemoryAuditLogAdapter } from "./memory-adapter";

let store: AuditLogAdapter | null = null;

export function getAuditLog(): AuditLogAdapter {
  if (!store) {
    store =
      auditDbBackend() === "postgres"
        ? new DrizzleAuditLogAdapter()
        : new MemoryAuditLogAdapter();
  }
  return store;
}

/** @internal test helper */
export function resetAuditLog(): void {
  store = null;
}

export const auditLog: AuditLogAdapter = new Proxy({} as AuditLogAdapter, {
  get(_target, prop, receiver) {
    const impl = getAuditLog();
    const value = Reflect.get(impl, prop, receiver);
    return typeof value === "function" ? value.bind(impl) : value;
  },
});
