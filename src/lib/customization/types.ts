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

/** Immutable published fragment before persistence. Private bytes stay out of reader DTOs. */
export type CompiledDeliveryFragment = {
  fragmentId: string;
  kind: string;
  ordinal: number;
  minimumAudience: Audience;
  payload: Record<string, unknown>;
  controlResourceIds: string[];
};

/** Discovery metadata only — matches the SQL public_dto allowlist. */
export type PublicDiscoveryDto = {
  key: string;
  title: string;
  summary: string;
  canonicalPath: string;
};

export type AuthorizedGuideDto = {
  key: string;
  locale: "en" | "fr";
  title: string;
  blocks: Array<{ id: string; type: string; payload: Record<string, unknown> }>;
  sources: Array<{ id: string; payload: Record<string, unknown> }>;
};

export type AuthorizedBrandDto = {
  key: string;
  locale: "en" | "fr";
  payload: Record<string, unknown>;
};

export type AuthorizedToolDto = {
  key: string;
  locale: "en" | "fr";
  payload: Record<string, unknown>;
};

export type AuthorizedWorkflowDto = {
  key: string;
  locale: "en" | "fr";
  payload: Record<string, unknown>;
};

export type AuthorizedSourceDto = {
  key: string;
  locale: "en" | "fr";
  payload: Record<string, unknown>;
};

export type AuthorizedContentDto =
  | AuthorizedGuideDto
  | AuthorizedBrandDto
  | AuthorizedToolDto
  | AuthorizedWorkflowDto
  | AuthorizedSourceDto;

export type ReaderContentResult =
  | { status: "missing" }
  | { status: "unavailable"; reason: "withdrawn" | "disabled" | "denied" | "service_error" }
  | { status: "resolved"; content: AuthorizedContentDto; releaseId?: string };
