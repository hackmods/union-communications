import { parseDefaultsManifest } from "@/lib/customization/defaults";
import { applyResourcePatch, assertResourceSemantics, mergePolicy, stricterAudience } from "@/lib/customization/merge";
import { layerSchema, parseBounded, resourceKeySchema, sourceDependencySchema } from "@/lib/customization/schemas";
import { resolveScopeChain } from "@/lib/customization/scope";
import type { Audience, CustomizationResource, Origin, ResolutionResult } from "@/lib/customization/types";

export interface ResolutionInput {
  key: string;
  manifest: unknown;
  /** Authoritative scope descriptors, not a user's asserted tenant relationships. */
  scopes: readonly unknown[];
  targetScopeId?: string;
  /** Only active records for this key and exact chain; zero records means inherit. */
  layers: readonly unknown[];
  sourceDependencies?: readonly unknown[];
}

/** Pure publication/compiler foundation. This is NOT an authorization or reader API. */
export function resolveCustomization(input: ResolutionInput): ResolutionResult {
  const key = resourceKeySchema.parse(input.key);
  const manifest = parseDefaultsManifest(input.manifest);
  const chain = resolveScopeChain(input.scopes, input.targetScopeId);
  const scopeIds = new Set(chain.map((scope) => scope.id));
  if (input.layers.length > chain.length) throw new Error("Too many layers for scope chain");
  const layers = input.layers.map((layer) => parseBounded(layerSchema, layer));
  const byScope = new Map(layers.map((layer) => [layer.scopeId, layer]));
  if (byScope.size !== layers.length) throw new Error("Multiple active layers for one scope");
  if (layers.some((layer) => layer.key !== key || !scopeIds.has(layer.scopeId))) throw new Error("Layer outside requested resource or scope");
  const dependencies = (input.sourceDependencies ?? []).map((source) => parseBounded(sourceDependencySchema, source));
  if (dependencies.length > 100) throw new Error("Too many source dependencies");
  if (dependencies.some((source) => !scopeIds.has(source.scopeId))) throw new Error("Source dependency outside scope chain");
  const dependencyMap = new Map(dependencies.map((source) => [`${source.id}@${source.revisionId}`, source]));
  if (dependencyMap.size !== dependencies.length) throw new Error("Duplicate source dependency");

  let resource: CustomizationResource | undefined = manifest.resources.find((entry) => entry.key === key);
  let origin: Origin = { scopeId: chain[0].id, revisionId: `compiled-${manifest.version}` };
  const provenance: Record<string, Origin> = {};
  const blockAudienceFloors = new Map<string, Audience>();
  const recordDefinition = () => {
    if (!resource) return;
    provenance.payload = origin;
    provenance.policy = origin;
    for (const field of ["audience", "enabled", "editableFields"]) provenance[`policy:${field}`] = origin;
    for (const field of Object.keys(resource.payload)) if (field !== "kind") provenance[`field:${field}`] = origin;
    if (resource.payload.kind === "guide") {
      for (const block of resource.payload.blocks) {
        provenance[`block:${block.id}`] = origin;
        blockAudienceFloors.set(block.id, block.audience);
      }
      for (const source of resource.payload.sources) provenance[`source:${source.id}`] = origin;
    }
  };
  recordDefinition();
  if (resource && !resource.policy.enabled) return { status: "unavailable", reason: "disabled", origin };
  for (const scope of chain) {
    const layer = byScope.get(scope.id);
    if (!layer || layer.mode === "inherit") continue;
    origin = { scopeId: layer.scopeId, revisionId: layer.revisionId };
    if (layer.mode === "withdraw") return { status: "unavailable", reason: "withdrawn", origin };
    if (layer.mode === "define") {
      if (resource) throw new Error("Use a typed patch to override an existing resource");
      if (layer.resource.key !== key) throw new Error("Definition key mismatch");
      resource = layer.resource;
      recordDefinition();
    } else {
      if (!resource) throw new Error("Cannot patch an absent resource");
      resource = applyResourcePatch(resource, layer.patch, origin, provenance, blockAudienceFloors);
      const inheritedPolicy = resource.policy;
      resource.policy = mergePolicy(inheritedPolicy, layer.policy);
      for (const field of ["audience", "enabled", "editableFields"] as const) {
        if (JSON.stringify(inheritedPolicy[field]) !== JSON.stringify(resource.policy[field])) {
          provenance[`policy:${field}`] = origin;
          provenance.policy = origin;
        }
      }
    }
    assertResourceSemantics(resource);
    if (!resource.policy.enabled) return { status: "unavailable", reason: "disabled", origin };
  }
  if (!resource) return { status: "missing" };
  assertResourceSemantics(resource);
  if (resource.payload.kind === "guide") {
    const references = new Map(resource.payload.sources.map((source) => [source.id, source]));
    for (const reference of references.values()) {
      const dependency = dependencyMap.get(`${reference.id}@${reference.revisionId}`);
      if (!dependency) throw new Error("Missing pinned source dependency");
      if (dependency.payload.reviewDueAt < dependency.payload.checkedAt) throw new Error("Invalid source review dates");
    }
    for (const block of resource.payload.blocks) {
      const audience = stricterAudience(resource.policy.audience, block.audience);
      for (const id of block.sourceIds) {
        const reference = references.get(id)!;
        const dependency = dependencyMap.get(`${id}@${reference.revisionId}`)!;
        if (stricterAudience(audience, dependency.audience) !== audience) throw new Error("Source is more restricted than its consuming block");
      }
    }
  }
  return { status: "resolved", resource, provenance, manifestVersion: manifest.version };
}
