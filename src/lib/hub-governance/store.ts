import { bylawsDbBackend, proposalsDbBackend } from "@/lib/db/backend";
import type { BylawsAdapter, ProposalsAdapter } from "./adapter";
import { DrizzleBylawsAdapter } from "./bylaws-drizzle-adapter";
import { memoryBylawsStore } from "./bylaws-memory-adapter";
import { DrizzleProposalsAdapter } from "./proposals-drizzle-adapter";
import { memoryProposalsStore } from "./proposals-memory-adapter";

let bylaws: BylawsAdapter | null = null;
let proposals: ProposalsAdapter | null = null;

/**
 * Hub governance stores — memory by default; Postgres behind the
 * `*_DB_BACKEND=postgres` flags. Tenancy is enforced by RLS policies in
 * migration 0039 once the operator flips; API routes wrap every store call in
 * `withRlsContext(rlsContextForSession(session), ...)` so the RLS session GUCs
 * are set (memory mode is a pass-through). `withTenantRlsScope` is not used
 * here because the adapter method names carry their scope in the first argument
 * rather than `list` / `create` (see `src/lib/db/rls-store.ts`).
 */
export function getBylawsStore(): BylawsAdapter {
  if (!bylaws) {
    bylaws =
      bylawsDbBackend() === "postgres"
        ? new DrizzleBylawsAdapter()
        : memoryBylawsStore;
  }
  return bylaws;
}

export function getProposalsStore(): ProposalsAdapter {
  if (!proposals) {
    proposals =
      proposalsDbBackend() === "postgres"
        ? new DrizzleProposalsAdapter()
        : memoryProposalsStore;
  }
  return proposals;
}

/** @internal */
export function resetGovernanceStores(): void {
  bylaws = null;
  proposals = null;
  memoryBylawsStore.reset();
  memoryProposalsStore.reset();
}

export const bylawsStore: BylawsAdapter = new Proxy({} as BylawsAdapter, {
  get(_t, prop, receiver) {
    const impl = getBylawsStore();
    const value = Reflect.get(impl, prop, receiver);
    return typeof value === "function" ? value.bind(impl) : value;
  },
});

export const proposalsStore: ProposalsAdapter = new Proxy(
  {} as ProposalsAdapter,
  {
    get(_t, prop, receiver) {
      const impl = getProposalsStore();
      const value = Reflect.get(impl, prop, receiver);
      return typeof value === "function" ? value.bind(impl) : value;
    },
  },
);