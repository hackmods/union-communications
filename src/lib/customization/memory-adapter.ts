import { getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { AuthorizationActor } from "@/lib/authorization/model";
import type { RlsSessionContext } from "@/lib/db/rls-context";
import { customizationTables, mutableCustomizationTables, type CustomizationAdapter, type CustomizationTable, type CustomizationRow, type CustomizationTransaction } from "./adapter";
import { decideCustomizationRead, type ReaderPolicyInput } from "./policy";
import { resolveScopeChain } from "./scope";
import { scopeSchema } from "./schemas";
import { stricterAudience } from "./merge";
import type { Audience } from "./types";

type Row = Record<string, unknown>;
type State = Record<CustomizationTable, Row[]>;
const identity = (row: Row) => row.id ?? row.resourceId;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const matches = (row: Row, match: Row) => Object.entries(match).every(([key, value]) => value !== undefined && same(row[key], value));
const emptyState = () => Object.fromEntries(Object.keys(customizationTables).map(key => [key, []])) as unknown as State;
const uniqueKeys: Partial<Record<CustomizationTable, string[][]>> = {
  resources: [["scopeId", "key"], ["scopeId", "slug"]], revisions: [["resourceId", "revisionNo"]],
  sections: [["resourceId", "blockId"]], fragments: [["releaseId", "locale", "fragmentId"]],
  projections: [["releaseId", "locale"]], operations: [["actorId", "scopeId", "operationKey"]], bindings: [["presetId", "sectorId"]],
};
export interface MemoryCustomizationOptions {
  /** Server-owned actor resolver; never a request body or a preset identity. */
  actor: (userId?: string) => AuthorizationActor | null;
  locals: ReaderPolicyInput["locals"];
}

/** Serialized, rollback-capable test/demo store. Production cannot construct it. */
export class MemoryCustomizationAdapter implements CustomizationAdapter {
  private state = emptyState();
  private queue: Promise<void> = Promise.resolve();
  constructor(private readonly options: MemoryCustomizationOptions) {
    if (process.env.NODE_ENV === "production" || (process.env.NODE_ENV !== "test" && process.env.CUSTOMIZATION_ALLOW_MEMORY_DEMO !== "true")) throw new Error("Customization memory mode requires an explicit nonproduction demo");
  }
  readerTransaction<T>(context: RlsSessionContext, run: (tx: Pick<CustomizationTransaction, "read">) => Promise<T>): Promise<T> {
    return this.transaction({ ...context, mfaVerified: false, crossLocal: false }, tx => run({ read: tx.read }));
  }
  async transaction<T>(context: RlsSessionContext, run: (tx: CustomizationTransaction) => Promise<T>): Promise<T> {
    const previous = this.queue;
    let unlock!: () => void;
    this.queue = new Promise<void>(resolve => { unlock = resolve; });
    await previous;
    const state = structuredClone(this.state);
    let open = true;
    const actor = this.options.actor(context.userId);
    const root = Boolean(actor?.accountActive && actor.roles.includes("platform_admin") && actor.mfaVerified && context.mfaVerified);
    const target = context.unionId ?? null;
    const operator = (row: Row, write = false) => root && (row.unionId === target || (!write && row.unionId === null));
    const scopes = () => state.scopes.map(row => scopeSchema.parse(Object.fromEntries(Object.entries({ ...row, archived: Boolean(row.archivedAt) }).filter(([key, value]) => !["createdAt", "archivedAt"].includes(key) && value !== null))));
    const access = (resourceId: unknown, releaseId: unknown, audience: Audience, blockId?: unknown): boolean => {
      const resource = state.resources.find(row => row.id === resourceId && !row.archivedAt);
      const head = state.heads.find(row => row.resourceId === resourceId);
      if (!resource || !head?.activeReleaseId || head.activeReleaseId !== releaseId || (resource.unionId !== null && resource.unionId !== target)) return false;
      try {
        const directory = scopes();
        const chain = resolveScopeChain(directory, String(resource.scopeId));
        const selected = chain.at(-1)!;
        if (audience !== "public" && (selected.kind === "local" || selected.kind === "unit") && selected.localId !== context.localId) return false;
        const resources = state.resources.filter(row => row.key === resource.key && chain.some(scope => scope.id === row.scopeId));
        const controls = state.policies.filter(row => resources.some(r => r.id === row.resourceId) && (row.withdrawnAt || state.heads.some(h => h.resourceId === row.resourceId && h.activeReleaseId)));
        if (!controls.some(row => row.resourceId === resourceId)) return false;
        const sections = state.sections.filter(row => row.blockId === blockId && controls.some(p => p.resourceId === row.resourceId));
        const effectiveAudience = [...controls.map(row => row.audience), ...sections.map(row => row.minimumAudience)].reduce<Audience>((current, next) => stricterAudience(current, next as Audience), audience);
        if (effectiveAudience !== "public" && (selected.kind === "local" || selected.kind === "unit") && selected.localId !== context.localId) return false;
        return decideCustomizationRead({ actor, target: selected, scopes: directory, locals: this.options.locals, audience,
          policies: [...controls.map(row => ({ audience: row.audience as Audience, enabled: Boolean(row.enabled), editableFields: [] })), ...sections.map(row => ({ audience: row.minimumAudience as Audience, enabled: true, editableFields: [] }))],
          withdrawn: [...controls, ...sections].some(row => Boolean(row.withdrawnAt)), entitled: !controls.some(row => row.entitlementKey), allowDemoActor: true,
        }).allowed;
      } catch { return false; }
    };
    const readable = (table: CustomizationTable, row: Row): boolean => {
      if (operator(row)) return true;
      if (table === "projections") return access(row.resourceId, row.releaseId, "public");
      if (table !== "fragments" || !access(row.resourceId, row.releaseId, row.minimumAudience as Audience, row.fragmentId)) return false;
      return (row.controlResourceIds as string[]).every(id => access(id, state.heads.find(h => h.resourceId === id)?.activeReleaseId, "public"));
    };
    const validate = (table: CustomizationTable, row: Row, previousRow?: Row) => {
      if (!open) throw new Error("Customization transaction is closed");
      if (!operator(row, true)) throw new Error("Customization write denied");
      if (previousRow && (identity(row) !== identity(previousRow) || row.scopeId !== previousRow.scopeId || row.unionId !== previousRow.unionId)) throw new Error("Customization identity is immutable");
      if (previousRow && table === "resources" && (row.key !== previousRow.key || row.kind !== previousRow.kind)) throw new Error("Resource identity is immutable");
      if (previousRow && table === "scopes" && ["kind", "divisionId", "localId", "bargainingUnitId", "parentScopeId"].some(key => row[key] !== previousRow[key])) throw new Error("Scope identity is immutable");
      if (table === "scopes") {
        const proposed = state.scopes.filter(r => r !== previousRow);
        const normalized = [...proposed, row].map(r => Object.fromEntries(Object.entries({ ...r, archived: Boolean(r.archivedAt) }).filter(([key, value]) => !["createdAt", "archivedAt"].includes(key) && value !== null)));
        resolveScopeChain(normalized, String(row.id));
      } else {
        const scope = state.scopes.find(r => r.id === row.scopeId);
        if (!scope || scope.unionId !== row.unionId) throw new Error("Scope ownership mismatch");
        if (row.resourceId != null && !state.resources.some(r => r.id === row.resourceId && r.scopeId === row.scopeId)) throw new Error("Resource ownership mismatch");
        if (row.revisionId != null && !state.revisions.some(r => r.id === row.revisionId && r.resourceId === row.resourceId)) throw new Error("Revision ownership mismatch");
        for (const key of ["releaseId", "activeReleaseId", "baseReleaseId", "replacesReleaseId"]) {
          if (row[key] != null && !state.releases.some(r => r.id === row[key] && r.resourceId === row.resourceId)) throw new Error("Release ownership mismatch");
        }
        if (row.controlResourceIds && !(row.controlResourceIds as string[]).every(id => state.resources.some(r => r.id === id && (r.unionId === null || r.unionId === row.unionId)))) throw new Error("Control ownership mismatch");
      }
      for (const keys of [["id" in row ? "id" : "resourceId"], ...(uniqueKeys[table] ?? [])]) {
        if (keys.some(key => row[key] == null)) continue;
        if (state[table].some(other => other !== previousRow && keys.every(key => same(other[key], row[key])))) throw new Error("Duplicate customization identity");
      }
    };
    const tx: CustomizationTransaction = {
      read: async <K extends CustomizationTable>(table: K, match = {}) => {
        if (!open) throw new Error("Customization transaction is closed");
        return structuredClone(state[table].filter(row => matches(row, match) && readable(table, row))) as CustomizationRow<K>[];
      },
      insert: async <K extends CustomizationTable>(table: K, input: (typeof customizationTables)[K]["$inferInsert"]) => {
        const row: Row = structuredClone(input);
        const defaults: Row = { createdAt: new Date(), updatedAt: new Date(), publicListing: false, sectorId: "", ancestorHeads: {}, reviews: {}, controlResourceIds: [] };
        for (const [key, column] of Object.entries(getTableColumns(customizationTables[table] as PgTable))) {
          if (row[key] === undefined) {
            if (column.hasDefault && key in defaults) row[key] = structuredClone(defaults[key]);
            else if (!column.notNull) row[key] = null;
            else throw new Error(`Missing customization field: ${key}`);
          }
        }
        validate(table, row); state[table].push(row);
        return structuredClone(row) as CustomizationRow<K>;
      },
      update: async (table, match, changes) => {
        if (!mutableCustomizationTables.includes(table) || !Object.keys(match).length) throw new Error("Unbounded or immutable customization update");
        const updated: Row[] = [];
        for (const row of state[table].filter(row => matches(row, match) && operator(row, true))) {
          const next = { ...row, ...structuredClone(changes) };
          validate(table, next, row); Object.assign(row, next); updated.push(row);
        }
        return structuredClone(updated) as never;
      },
    };
    try { const result = await run(tx); this.state = state; return result; }
    finally { open = false; unlock(); }
  }
}
