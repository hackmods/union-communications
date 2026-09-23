import type { CustomizationResource, SourceDependency } from "@/lib/customization/types";
import type { ResolutionInput } from "@/lib/customization/resolve";

/** Fictional tenants only. Local 101 deliberately exists in both unions. */
export const scopes = [
  { id: "system", kind: "system" },
  { id: "alpha", kind: "union", unionId: "union-alpha", parentScopeId: "system" },
  { id: "beta", kind: "union", unionId: "union-beta", parentScopeId: "system" },
  { id: "academic", kind: "division", unionId: "union-alpha", divisionId: "division-academic", parentScopeId: "alpha" },
  { id: "support", kind: "division", unionId: "union-alpha", divisionId: "division-support", parentScopeId: "alpha" },
  { id: "alpha-101", kind: "local", unionId: "union-alpha", divisionId: "division-academic", localId: "local-alpha-101", parentScopeId: "academic" },
  { id: "alpha-102", kind: "local", unionId: "union-alpha", divisionId: "division-support", localId: "local-alpha-102", parentScopeId: "support" },
  { id: "beta-101", kind: "local", unionId: "union-beta", localId: "local-beta-101", parentScopeId: "beta" },
  { id: "full-time", kind: "unit", unionId: "union-alpha", divisionId: "division-academic", localId: "local-alpha-101", bargainingUnitId: "unit-full-time", parentScopeId: "alpha-101" },
  { id: "part-time", kind: "unit", unionId: "union-alpha", divisionId: "division-academic", localId: "local-alpha-101", bargainingUnitId: "unit-part-time", parentScopeId: "alpha-101" },
];
export const bilingual = (text: string) => ({ en: text, fr: `${text} (fr)` });
export function block(id = "prepare", audience: "public" | "verified_member" | "local_officer" = "public") {
  return { id, type: "paragraph" as const, audience, sourceIds: [] as string[], content: { en: [{ type: "text" as const, text: id }], fr: [{ type: "text" as const, text: `${id} (fr)` }] } };
}
export function guide(): CustomizationResource {
  return { schemaVersion: 1, key: "guide:meeting", policy: { audience: "public", enabled: true, editableFields: ["title", "blocks", "sources"] }, payload: { kind: "guide", title: bilingual("Generic meeting"), blocks: [block("prepare"), block("meeting", "verified_member")], sources: [] } };
}
export function brand(): CustomizationResource {
  return { schemaVersion: 1, key: "brand:baseline", policy: { audience: "public", enabled: true, editableFields: ["label", "logoAssetId"] }, payload: { kind: "brand", label: bilingual("Union"), primaryColor: "#112233", secondaryColor: "#445566", accentColor: "#778899", headlineFontId: "montserrat", bodyFontId: "sourceSans", logoAssetId: "logo-original" } };
}
export function source(): SourceDependency {
  return { id: "source:reference", revisionId: "source-v1", scopeId: "system", audience: "public", payload: { kind: "source", label: bilingual("Source"), note: bilingual("Check your agreement"), url: "https://example.org/guide", publisher: "Example", jurisdiction: "Example jurisdiction", applicability: bilingual("Example only"), checkedAt: "2026-09-22", reviewDueAt: "2027-09-22", rightsNote: null } };
}
export function input(resource: CustomizationResource = guide()): ResolutionInput {
  return { key: resource.key, manifest: { version: "1", resources: [resource] }, scopes, targetScopeId: "full-time", layers: [] };
}
export function patch(scopeId: string, content: unknown, policy?: unknown) {
  return { schemaVersion: 1, key: "guide:meeting", scopeId, revisionId: `revision-${scopeId}`, mode: "patch", patch: content, ...(policy ? { policy } : {}) };
}
