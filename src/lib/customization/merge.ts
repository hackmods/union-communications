import type { z } from "zod";
import { parseBounded, resourceSchema, type patchSchema } from "@/lib/customization/schemas";
import type { Audience, CustomizationPolicy, CustomizationResource, Origin } from "@/lib/customization/types";

const audienceRank: Record<Audience, number> = { public: 0, verified_member: 1, local_officer: 2 };
export function stricterAudience(left: Audience, right: Audience): Audience {
  return audienceRank[left] >= audienceRank[right] ? left : right;
}

export function mergePolicy(parent: CustomizationPolicy, patch?: Partial<CustomizationPolicy>): CustomizationPolicy {
  return {
    audience: patch?.audience ? stricterAudience(parent.audience, patch.audience) : parent.audience,
    enabled: parent.enabled && (patch?.enabled ?? true),
    editableFields: [...new Set(parent.editableFields)].filter((field) => !patch?.editableFields || patch.editableFields.includes(field)),
  };
}

type ItemOperation<T> = { op: "add" | "replace"; value: T } | { op: "remove"; id: string } | { op: "order"; ids: string[] };
function applyItems<T extends { id: string }>(items: T[], operations: ItemOperation<T>[], changed: (id: string) => void, normalize: (item: T) => T): T[] {
  let result = [...items];
  for (const op of operations) {
    if (op.op === "order") {
      const byId = new Map(result.map((item) => [item.id, item]));
      if (new Set(op.ids).size !== op.ids.length || op.ids.length !== result.length || op.ids.some((id) => !byId.has(id))) {
        throw new Error("Order must contain every stable ID exactly once");
      }
      result = op.ids.map((id) => byId.get(id)!);
      changed("$order");
    } else if (op.op === "remove") {
      if (!result.some((item) => item.id === op.id)) throw new Error(`Orphan removal: ${op.id}`);
      result = result.filter((item) => item.id !== op.id);
      changed(op.id);
    } else {
      const index = result.findIndex((item) => item.id === op.value.id);
      if (op.op === "add" && index !== -1) throw new Error(`Duplicate addition: ${op.value.id}`);
      if (op.op === "replace" && index === -1) throw new Error(`Orphan replacement: ${op.value.id}`);
      const value = normalize(op.value);
      if (index === -1) result.push(value);
      else result[index] = value;
      changed(value.id);
    }
  }
  return result;
}

/** Explicit schema-specific operations; never a recursive object/array merge. */
export function applyResourcePatch(
  resource: CustomizationResource,
  patch: z.infer<typeof patchSchema>,
  origin: Origin,
  provenance: Record<string, Origin>,
  blockAudienceFloors: Map<string, Audience>,
): CustomizationResource {
  const payload = resource.payload;
  if (patch.kind !== payload.kind) throw new Error("An override cannot change resource kind");
  const changed = (field: string) => { provenance[field] = origin; };
  if (payload.kind === "guide" && patch.kind === "guide") {
    if (patch.title) { payload.title = patch.title.value; changed("field:title"); }
    if (patch.blocks) payload.blocks = applyItems(payload.blocks, patch.blocks, (id) => changed(id === "$order" ? "order:blocks" : `block:${id}`), (block) => {
      const audience = stricterAudience(blockAudienceFloors.get(block.id) ?? "public", block.audience);
      blockAudienceFloors.set(block.id, audience);
      return { ...block, audience };
    });
    if (patch.sources) payload.sources = applyItems(payload.sources, patch.sources, (id) => changed(id === "$order" ? "order:sources" : `source:${id}`), (source) => source);
  } else if (payload.kind === "brand" && patch.kind === "brand") {
    if (patch.label) { payload.label = patch.label.value; changed("field:label"); }
    for (const field of ["primaryColor", "secondaryColor", "accentColor", "headlineFontId", "bodyFontId"] as const) {
      const operation = patch[field];
      if (operation) { payload[field] = operation.value; changed(`field:${field}`); }
    }
    if (patch.logoAssetId) { payload.logoAssetId = patch.logoAssetId.op === "clear" ? null : patch.logoAssetId.value; changed("field:logoAssetId"); }
  } else if (patch.kind === "workflow" || patch.kind === "source") {
    resource.payload = patch.replacement;
    changed("payload");
    for (const field of Object.keys(patch.replacement)) if (field !== "kind") changed(`field:${field}`);
  } else if (payload.kind === "tool" && patch.kind === "tool") {
    if (patch.configuration.toolId !== payload.configuration.toolId) throw new Error("An override cannot change the tool");
    payload.configuration = patch.configuration;
    changed("field:configuration");
  }
  return parseBounded(resourceSchema, resource);
}

export function assertResourceSemantics(resource: CustomizationResource): void {
  const payload = resource.payload;
  if (!resource.key.startsWith(`${payload.kind}:`)) throw new Error("Resource key and kind mismatch");
  if (payload.kind === "brand" && resource.key !== "brand:baseline") throw new Error("Unknown brand resource");
  if (payload.kind === "tool" && resource.key !== `tool:${payload.configuration.toolId}`) throw new Error("Unregistered tool key");
  if (payload.kind === "workflow") {
    if (resource.key !== `workflow:${payload.workflowId}`) throw new Error("Unregistered workflow key");
    if (new Set(payload.steps.map((step) => step.id)).size !== payload.steps.length || payload.steps.some((step, index) => step.number !== index + 1)) throw new Error("Workflow steps require unique IDs and consecutive numbers");
  }
  if (payload.kind === "source" && payload.reviewDueAt < payload.checkedAt) throw new Error("Source review date precedes checked date");
  if (payload.kind === "guide") {
    if (new Set(payload.blocks.map((block) => block.id)).size !== payload.blocks.length) throw new Error("Duplicate block ID");
    if (new Set(payload.sources.map((source) => source.id)).size !== payload.sources.length) throw new Error("Duplicate source ID");
    for (const block of payload.blocks) {
      if (new Set(block.sourceIds).size !== block.sourceIds.length) throw new Error("Duplicate block source reference");
      if (block.sourceIds.some((id) => !payload.sources.some((source) => source.id === id))) throw new Error("Dangling block source reference");
    }
  }
}
