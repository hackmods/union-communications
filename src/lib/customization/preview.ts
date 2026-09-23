import { compilePublication } from "@/lib/customization/compile";
import { buildBlockImpactReport, type ImpactReport } from "@/lib/customization/dependencies";
import { COMPILED_DEFAULTS } from "@/lib/customization/defaults";
import { resolveCustomization } from "@/lib/customization/resolve";
import { resolveScopeChain } from "@/lib/customization/scope";
import type { CustomizationLayer, GuideBlock, ResolutionResult } from "@/lib/customization/types";

export type PreviewDiagnostics = {
  resolution: ResolutionResult;
  dependencyManifest: Record<string, string>;
  impact?: ImpactReport;
  bilingualComplete: boolean;
  unreviewedLocales: Array<"en" | "fr">;
};

export type AuthorizedPreview = {
  /** Private management projection — never cache as a public response. */
  status: "private";
  cacheControl: "private, no-store";
  locale: "en" | "fr";
  fragments: ReturnType<typeof compilePublication>["fragmentsByLocale"]["en"];
  discovery: ReturnType<typeof compilePublication>["projectionsByLocale"]["en"];
  diagnostics: PreviewDiagnostics;
};

function bilingualComplete(resource: Extract<ResolutionResult, { status: "resolved" }>["resource"]): boolean {
  if (resource.payload.kind === "guide") {
    const titleOk = Boolean(resource.payload.title.en.trim() && resource.payload.title.fr.trim());
    const blocksOk = resource.payload.blocks.every((block) => {
      if (block.type === "heading" || block.type === "sourceList" || block.type === "steps") {
        const content = block.content as { en: unknown; fr: unknown };
        return content.en != null && content.fr != null;
      }
      return true;
    });
    return titleOk && blocksOk;
  }
  if (resource.payload.kind === "brand" || resource.payload.kind === "source") {
    return Boolean(resource.payload.label.en.trim() && resource.payload.label.fr.trim());
  }
  return true;
}

function unreviewedLocales(
  reviews: Record<string, { hash: string }>,
  contentHash: string,
): Array<"en" | "fr"> {
  const missing: Array<"en" | "fr"> = [];
  for (const locale of ["en", "fr"] as const) {
    if (reviews[locale]?.hash !== contentHash) missing.push(locale);
  }
  return missing;
}

/** Authenticated preview of a draft overlay. Never a permanent share token. */
export function previewDraftContent(input: {
  key: string;
  locale: "en" | "fr";
  scopes: readonly unknown[];
  targetScopeId: string;
  layers: readonly unknown[];
  sourceDependencies?: readonly unknown[];
  manifest?: unknown;
  reviews?: Record<string, { hash: string }>;
  contentHash?: string;
  beforeBlocks?: readonly Pick<GuideBlock, "id" | "type">[];
  descendantOverrides?: readonly { scopeId: string; blockIds: readonly string[] }[];
  affectedReleaseCount?: number;
}): AuthorizedPreview {
  const compiled = compilePublication({
    key: input.key,
    manifest: input.manifest ?? COMPILED_DEFAULTS,
    scopes: input.scopes,
    targetScopeId: input.targetScopeId,
    layers: input.layers,
    sourceDependencies: input.sourceDependencies,
    releaseId: "preview",
    resourceId: "preview",
    scopeId: input.targetScopeId,
  });
  const resolved = compiled.resolution.status === "resolved" ? compiled.resolution.resource : null;
  const afterBlocks = resolved?.payload.kind === "guide" ? resolved.payload.blocks : [];
  const impact = input.beforeBlocks
    ? buildBlockImpactReport({
      affectedReleaseCount: input.affectedReleaseCount ?? 1,
      parentScopeId: input.targetScopeId,
      resourceKey: input.key,
      beforeBlocks: input.beforeBlocks,
      afterBlocks,
      descendantOverrides: input.descendantOverrides ?? [],
    })
    : undefined;
  return {
    status: "private",
    cacheControl: "private, no-store",
    locale: input.locale,
    fragments: compiled.fragmentsByLocale[input.locale],
    discovery: compiled.projectionsByLocale[input.locale],
    diagnostics: {
      resolution: compiled.resolution,
      dependencyManifest: compiled.dependencyManifest,
      impact,
      bilingualComplete: resolved ? bilingualComplete(resolved) : false,
      unreviewedLocales: unreviewedLocales(input.reviews ?? {}, input.contentHash ?? ""),
    },
  };
}

/** Compare a draft layer against the currently resolved parent for orphan/changed blocks. */
export function previewLayerImpact(input: {
  key: string;
  scopes: readonly unknown[];
  targetScopeId: string;
  currentLayers: readonly CustomizationLayer[];
  draftLayer: CustomizationLayer;
  descendantOverrides: readonly { scopeId: string; blockIds: readonly string[] }[];
  affectedReleaseCount: number;
  manifest?: unknown;
}): ImpactReport {
  const before = resolveCustomization({
    key: input.key,
    manifest: input.manifest ?? COMPILED_DEFAULTS,
    scopes: input.scopes,
    targetScopeId: input.targetScopeId,
    layers: input.currentLayers,
  });
  const afterLayers = [
    ...input.currentLayers.filter((layer) => layer.scopeId !== input.draftLayer.scopeId),
    input.draftLayer,
  ];
  const after = resolveCustomization({
    key: input.key,
    manifest: input.manifest ?? COMPILED_DEFAULTS,
    scopes: input.scopes,
    targetScopeId: input.targetScopeId,
    layers: afterLayers,
  });
  const beforeBlocks = before.status === "resolved" && before.resource.payload.kind === "guide"
    ? before.resource.payload.blocks
    : [];
  const afterBlocks = after.status === "resolved" && after.resource.payload.kind === "guide"
    ? after.resource.payload.blocks
    : [];
  return buildBlockImpactReport({
    affectedReleaseCount: input.affectedReleaseCount,
    parentScopeId: resolveScopeChain(input.scopes, input.targetScopeId).at(-1)!.id,
    resourceKey: input.key,
    beforeBlocks,
    afterBlocks,
    descendantOverrides: input.descendantOverrides,
  });
}
