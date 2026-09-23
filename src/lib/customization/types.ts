import type { z } from "zod";
import type { audienceSchema, blockSchema, layerSchema, payloadSchema, policySchema, resourceSchema, scopeSchema, sourceDependencySchema } from "@/lib/customization/schemas";

export type Audience = z.infer<typeof audienceSchema>;
export type CustomizationScope = z.infer<typeof scopeSchema>;
export type CustomizationPayload = z.infer<typeof payloadSchema>;
export type CustomizationResource = z.infer<typeof resourceSchema>;
export type CustomizationLayer = z.infer<typeof layerSchema>;
export type CustomizationPolicy = z.infer<typeof policySchema>;
export type GuideBlock = z.infer<typeof blockSchema>;
export type SourceDependency = z.infer<typeof sourceDependencySchema>;
export type Origin = { scopeId: string; revisionId: string };
/** Compiler output, NOT a safe reader DTO. C03/C05 must authorize and project it. */
export type ResolutionResult =
  | { status: "missing" }
  | { status: "unavailable"; reason: "withdrawn" | "disabled"; origin: Origin }
  | { status: "resolved"; resource: CustomizationResource; provenance: Record<string, Origin>; manifestVersion: string };
