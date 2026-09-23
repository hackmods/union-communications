import { z } from "zod";
import { idSchema, parseBounded, resourceSchema } from "@/lib/customization/schemas";
import { assertResourceSemantics } from "@/lib/customization/merge";

const manifestSchema = z.object({
  version: idSchema,
  resources: z.array(resourceSchema).max(500),
}).strict();
export type CompiledDefaultsManifest = z.infer<typeof manifestSchema>;

/** Code-owned manifest: no seed tenant, browser preset or implicit locale fallback. */
export function parseDefaultsManifest(input: unknown): CompiledDefaultsManifest {
  // The per-resource byte bound still applies when a manifest contains many resources.
  const manifest = manifestSchema.parse(input);
  if (new Set(manifest.resources.map((resource) => resource.key)).size !== manifest.resources.length) throw new Error("Duplicate default resource key");
  for (const resource of manifest.resources) {
    parseBounded(resourceSchema, resource);
    assertResourceSemantics(resource);
  }
  return manifest;
}

/** Empty until consumers convert in C08; existing TSX defaults are not duplicated. */
export const COMPILED_DEFAULTS: CompiledDefaultsManifest = { version: "1", resources: [] };
