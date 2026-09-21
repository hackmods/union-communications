import { withTenantRlsScope } from "@/lib/db/rls-store";
import type { AccessRequestAdapter } from "./adapter";
import { DrizzleAccessRequestAdapter } from "./drizzle-adapter";
import { memoryAccessRequestStore } from "./memory-adapter";
let store: AccessRequestAdapter | null = null;
export function accessRequestDbBackend() { return process.env.ACCESS_REQUEST_DB_BACKEND?.trim().toLowerCase() === "postgres" && process.env.DATABASE_URL?.trim() ? "postgres" : "memory"; }
export function getAccessRequestStore() { if(!store) store=accessRequestDbBackend()==="postgres" ? withTenantRlsScope(new DrizzleAccessRequestAdapter()) : memoryAccessRequestStore; return store; }
export const accessRequestStore = new Proxy({} as AccessRequestAdapter, { get(_t,p,r){const impl=getAccessRequestStore(); const v=Reflect.get(impl,p,r); return typeof v === "function" ? v.bind(impl) : v;} });
export const isAccessRequestDurable = () => accessRequestDbBackend() === "postgres";


