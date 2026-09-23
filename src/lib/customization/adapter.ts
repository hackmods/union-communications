import * as tables from "@/lib/db/schema/customization";

export const customizationTables = {
  scopes: tables.customizationScopes, resources: tables.customizationResources,
  drafts: tables.customizationDrafts, revisions: tables.customizationRevisions,
  releases: tables.customizationReleases, heads: tables.customizationHeads,
  policies: tables.customizationPolicies, sections: tables.customizationSectionControls,
  fragments: tables.customizationDeliveryFragments, projections: tables.customizationPublicProjections,
  grants: tables.customizationMaintenanceGrants, bindings: tables.customizationPresetBindings,
  assets: tables.customizationAssets, audit: tables.customizationAudit, operations: tables.customizationOperations,
} as const;
export type CustomizationTable = keyof typeof customizationTables;
export type CustomizationRow<K extends CustomizationTable> = (typeof customizationTables)[K]["$inferSelect"];
export type CustomizationInsert<K extends CustomizationTable> = (typeof customizationTables)[K]["$inferInsert"];
export type MutableCustomizationTable = "drafts" | "heads" | "policies" | "sections" | "grants" | "bindings" | "assets" | "resources" | "scopes";
export const mutableCustomizationTables: readonly CustomizationTable[] = ["drafts", "heads", "policies", "sections", "grants", "bindings", "assets", "resources", "scopes"];
export type RowMatch<K extends CustomizationTable> = Partial<CustomizationRow<K>>;

/** Internal transaction API. Raw authoring rows must never become reader DTOs. */
export interface CustomizationTransaction {
  read<K extends CustomizationTable>(table: K, match?: RowMatch<K>, lock?: boolean): Promise<CustomizationRow<K>[]>;
  insert<K extends CustomizationTable>(table: K, row: CustomizationInsert<K>): Promise<CustomizationRow<K>>;
  /** Match includes the expected lockVersion/generation for optimistic writes. */
  update<K extends MutableCustomizationTable>(table: K, match: RowMatch<K>, changes: Partial<CustomizationInsert<K>>): Promise<CustomizationRow<K>[]>;
}
export interface CustomizationAdapter {
  transaction<T>(context: import("@/lib/db/rls-context").RlsSessionContext, run: (tx: CustomizationTransaction) => Promise<T>): Promise<T>;
  /** Ordinary readers, including Root, never get the authoring RLS bypass. */
  readerTransaction<T>(context: import("@/lib/db/rls-context").RlsSessionContext, run: (tx: Pick<CustomizationTransaction, "read">) => Promise<T>): Promise<T>;
}
