import type { CustomizationAdapter } from "@/lib/customization/adapter";
import { idSchema, resourceKeySchema, scopeSchema } from "@/lib/customization/schemas";
import type { CustomizationScope } from "@/lib/customization/types";
import type { RlsSessionContext } from "@/lib/db/rls-context";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function listCustomizationScopes(
  adapter: CustomizationAdapter,
  context: RlsSessionContext,
): Promise<CustomizationScope[]> {
  return adapter.transaction(context, async (tx) => {
    const rows = await tx.read("scopes");
    return rows
      .filter((row) => !row.archivedAt)
      .map((row) => scopeSchema.parse(Object.fromEntries(
        Object.entries({
          id: row.id,
          kind: row.kind,
          unionId: row.unionId,
          divisionId: row.divisionId,
          localId: row.localId,
          bargainingUnitId: row.bargainingUnitId,
          parentScopeId: row.parentScopeId,
          archived: Boolean(row.archivedAt),
        }).filter(([, value]) => value !== null && value !== undefined),
      )));
  });
}

export async function createCustomizationScope(
  adapter: CustomizationAdapter,
  context: RlsSessionContext,
  input: CustomizationScope,
): Promise<CustomizationScope> {
  const scope = scopeSchema.parse(input);
  return adapter.transaction(context, async (tx) => {
    await tx.insert("scopes", {
      id: scope.id,
      kind: scope.kind,
      unionId: scope.kind === "system" ? null : scope.unionId,
      divisionId: "divisionId" in scope ? scope.divisionId : null,
      localId: "localId" in scope ? scope.localId : null,
      bargainingUnitId: "bargainingUnitId" in scope ? scope.bargainingUnitId : null,
      parentScopeId: scope.kind === "system" ? null : scope.parentScopeId,
    });
    return scope;
  });
}

export async function createCustomizationResource(
  adapter: CustomizationAdapter,
  context: RlsSessionContext,
  input: {
    scopeId: string;
    unionId: string | null;
    key: string;
    kind: "guide" | "brand" | "source" | "tool" | "workflow";
    slug?: string;
    actorId: string;
  },
): Promise<{ resourceId: string }> {
  const key = resourceKeySchema.parse(input.key);
  const scopeId = idSchema.parse(input.scopeId);
  const resourceId = newId("resource");
  await adapter.transaction(context, async (tx) => {
    await tx.insert("resources", {
      id: resourceId,
      scopeId,
      unionId: input.unionId,
      key,
      kind: input.kind,
      slug: input.slug ?? null,
      createdBy: input.actorId,
    });
    await tx.insert("heads", {
      resourceId,
      scopeId,
      unionId: input.unionId,
      generation: 1,
    });
    await tx.insert("policies", {
      resourceId,
      scopeId,
      unionId: input.unionId,
      audience: "public",
      enabled: true,
      policyVersion: 1,
      editableFields: [],
      updatedBy: input.actorId,
    });
  });
  return { resourceId };
}
