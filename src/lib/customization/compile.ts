import type { AuthorizationActor } from "@/lib/authorization/model";
import type { CustomizationAdapter } from "@/lib/customization/adapter";
import { buildContentCacheKey, ImmutableContentCache, type CachedCompiledContent } from "@/lib/customization/cache";
import { buildDependencyManifest, pinSourceDependencies } from "@/lib/customization/dependencies";
import { COMPILED_DEFAULTS } from "@/lib/customization/defaults";
import { decideCustomizationRead, type ReaderPolicyInput } from "@/lib/customization/policy";
import { resolveCustomization, type ResolutionInput } from "@/lib/customization/resolve";
import { resourceKeySchema, SCHEMA_VERSION } from "@/lib/customization/schemas";
import { resolveScopeChain } from "@/lib/customization/scope";
import type {
  Audience,
  AuthorizedContentDto,
  CompiledDeliveryFragment,
  CustomizationResource,
  PublicDiscoveryDto,
  ReaderContentResult,
  ResolutionResult,
} from "@/lib/customization/types";
import type { RlsSessionContext } from "@/lib/db/rls-context";

export type CompilePublicationInput = ResolutionInput & {
  releaseId: string;
  resourceId: string;
  scopeId: string;
  locales?: readonly ("en" | "fr")[];
  canonicalPath?: string;
  summary?: { en: string; fr: string };
  /** Map source resource keys to control resource row IDs for fragment ACL. */
  controlResourceIdsBySourceKey?: Readonly<Record<string, string>>;
};

export type CompiledPublication = {
  resolution: ResolutionResult;
  dependencyManifest: Record<string, string>;
  fragmentsByLocale: Record<"en" | "fr", CompiledDeliveryFragment[]>;
  projectionsByLocale: Record<"en" | "fr", PublicDiscoveryDto>;
};

function localizedText(value: { en: string; fr: string }, locale: "en" | "fr"): string {
  return value[locale];
}

function localizeUnknown(value: unknown, locale: "en" | "fr"): unknown {
  if (Array.isArray(value)) return value.map((entry) => localizeUnknown(entry, locale));
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  if ("en" in record && "fr" in record && Object.keys(record).length === 2) {
    return record[locale];
  }
  return Object.fromEntries(Object.entries(record).map(([key, entry]) => [key, localizeUnknown(entry, locale)]));
}

function materializeFragments(
  resource: CustomizationResource,
  locale: "en" | "fr",
  controlResourceIdsBySourceKey: Readonly<Record<string, string>>,
): CompiledDeliveryFragment[] {
  const title = resource.payload.kind === "guide"
    ? localizedText(resource.payload.title, locale)
    : resource.payload.kind === "brand" || resource.payload.kind === "source"
      ? localizedText(resource.payload.label, locale)
      : resource.key;
  const fragments: CompiledDeliveryFragment[] = [{
    fragmentId: "meta",
    kind: "meta",
    ordinal: 0,
    minimumAudience: resource.policy.audience,
    payload: { key: resource.key, kind: resource.payload.kind, title },
    controlResourceIds: [],
  }];
  if (resource.payload.kind === "guide") {
    const guide = resource.payload;
    guide.blocks.forEach((block, index) => {
      fragments.push({
        fragmentId: block.id,
        kind: block.type,
        ordinal: index + 1,
        minimumAudience: block.audience,
        payload: {
          id: block.id,
          type: block.type,
          sourceIds: block.sourceIds,
          content: localizeUnknown(block.content, locale),
          ...(block.type === "heading" ? { level: block.level } : {}),
          ...(block.type === "callout" ? { tone: block.tone } : {}),
          ...(block.type === "list" ? { ordered: block.ordered } : {}),
        },
        controlResourceIds: block.sourceIds
          .map((sourceId) => controlResourceIdsBySourceKey[sourceId])
          .filter((value): value is string => Boolean(value)),
      });
    });
    guide.sources.forEach((reference, index) => {
      fragments.push({
        fragmentId: reference.id,
        kind: "sourceRef",
        ordinal: guide.blocks.length + index + 1,
        minimumAudience: resource.policy.audience,
        payload: { id: reference.id, revisionId: reference.revisionId },
        controlResourceIds: controlResourceIdsBySourceKey[reference.id]
          ? [controlResourceIdsBySourceKey[reference.id]]
          : [],
      });
    });
    return fragments;
  }
  fragments.push({
    fragmentId: "payload",
    kind: resource.payload.kind,
    ordinal: 1,
    minimumAudience: resource.policy.audience,
    payload: localizeUnknown(resource.payload, locale) as Record<string, unknown>,
    controlResourceIds: [],
  });
  return fragments;
}

function publicDiscovery(
  resource: CustomizationResource,
  locale: "en" | "fr",
  canonicalPath: string,
  summary: { en: string; fr: string },
): PublicDiscoveryDto {
  const title = resource.payload.kind === "guide"
    ? localizedText(resource.payload.title, locale)
    : resource.payload.kind === "brand" || resource.payload.kind === "source"
      ? localizedText(resource.payload.label, locale)
      : resource.key;
  return { key: resource.key, title, summary: localizedText(summary, locale), canonicalPath };
}

function activeLayerRevision(layers: readonly unknown[], manifestVersion: string): string {
  for (const layer of layers) {
    if (!layer || typeof layer !== "object") continue;
    const record = layer as { mode?: string; revisionId?: string };
    if (record.mode && record.mode !== "inherit" && typeof record.revisionId === "string") {
      return record.revisionId;
    }
  }
  return `compiled-${manifestVersion}`;
}

/** Authoring/compiler path: resolve overlays, pin dependencies, emit immutable fragments. */
export function compilePublication(input: CompilePublicationInput): CompiledPublication {
  const key = resourceKeySchema.parse(input.key);
  const resolution = resolveCustomization(input);
  const sourcePins = resolution.status === "resolved" && resolution.resource.payload.kind === "guide" && input.sourceDependencies
    ? pinSourceDependencies(resolution.resource.payload.sources, input.sourceDependencies)
    : [];
  // Re-resolve with stably ordered pins so publication output never depends on input order.
  const pinnedResolution = sourcePins.length
    ? resolveCustomization({ ...input, sourceDependencies: sourcePins })
    : resolution;
  const manifestVersion = pinnedResolution.status === "resolved"
    ? pinnedResolution.manifestVersion
    : typeof input.manifest === "object" && input.manifest && "version" in input.manifest
      ? String((input.manifest as { version: string }).version)
      : "1";
  const dependencyManifest = buildDependencyManifest({
    [key]: activeLayerRevision(input.layers, manifestVersion),
    ...Object.fromEntries(sourcePins.map((source) => [source.id, source.revisionId])),
  });
  const emptyDiscovery = {
    en: { key, title: key, summary: "", canonicalPath: input.canonicalPath ?? `/learn/custom/${key}` },
    fr: { key, title: key, summary: "", canonicalPath: input.canonicalPath ?? `/learn/custom/${key}` },
  };
  if (pinnedResolution.status !== "resolved") {
    return {
      resolution: pinnedResolution,
      dependencyManifest,
      fragmentsByLocale: { en: [], fr: [] },
      projectionsByLocale: emptyDiscovery,
    };
  }
  const locales = input.locales ?? (["en", "fr"] as const);
  const summary = input.summary ?? { en: "", fr: "" };
  const canonicalPath = input.canonicalPath ?? `/learn/custom/${key}`;
  const controls = input.controlResourceIdsBySourceKey ?? {};
  const fragmentsByLocale = { en: [] as CompiledDeliveryFragment[], fr: [] as CompiledDeliveryFragment[] };
  const projectionsByLocale = {
    en: publicDiscovery(pinnedResolution.resource, "en", canonicalPath, summary),
    fr: publicDiscovery(pinnedResolution.resource, "fr", canonicalPath, summary),
  };
  for (const locale of locales) {
    fragmentsByLocale[locale] = materializeFragments(pinnedResolution.resource, locale, controls);
  }
  return { resolution: pinnedResolution, dependencyManifest, fragmentsByLocale, projectionsByLocale };
}

function assembleAuthorizedDto(
  resourceKey: string,
  locale: "en" | "fr",
  fragments: readonly CompiledDeliveryFragment[],
): AuthorizedContentDto | null {
  const ordered = [...fragments].sort((left, right) => left.ordinal - right.ordinal || (left.fragmentId < right.fragmentId ? -1 : 1));
  const meta = ordered.find((fragment) => fragment.fragmentId === "meta");
  if (!meta || meta.payload.key !== resourceKey) return null;
  const kind = String(meta.payload.kind ?? "");
  if (kind === "guide") {
    return {
      key: resourceKey,
      locale,
      title: String(meta.payload.title ?? resourceKey),
      blocks: ordered
        .filter((fragment) => fragment.kind !== "meta" && fragment.kind !== "sourceRef")
        .map((fragment) => ({ id: fragment.fragmentId, type: fragment.kind, payload: fragment.payload })),
      sources: ordered
        .filter((fragment) => fragment.kind === "sourceRef")
        .map((fragment) => ({ id: fragment.fragmentId, payload: fragment.payload })),
    };
  }
  const payloadFragment = ordered.find((fragment) => fragment.fragmentId === "payload");
  if (!payloadFragment) return null;
  return { key: resourceKey, locale, payload: payloadFragment.payload };
}

function fallbackFromManifest(input: {
  key: string;
  locale: "en" | "fr";
  scopes: readonly unknown[];
  targetScopeId?: string;
  manifest: unknown;
}): ReaderContentResult {
  const resolution = resolveCustomization({
    key: input.key,
    manifest: input.manifest,
    scopes: input.scopes,
    targetScopeId: input.targetScopeId,
    layers: [],
  });
  if (resolution.status === "missing") return { status: "missing" };
  if (resolution.status === "unavailable") return { status: "unavailable", reason: resolution.reason };
  const compiled = compilePublication({
    key: input.key,
    manifest: input.manifest,
    scopes: input.scopes,
    targetScopeId: input.targetScopeId,
    layers: [],
    releaseId: `compiled-${resolution.manifestVersion}`,
    resourceId: `compiled:${input.key}`,
    scopeId: resolveScopeChain(input.scopes, input.targetScopeId).at(-1)!.id,
  });
  const dto = assembleAuthorizedDto(input.key, input.locale, compiled.fragmentsByLocale[input.locale]);
  return dto ? { status: "resolved", content: dto } : { status: "missing" };
}

export type ReadPublishedContentInput = {
  adapter: CustomizationAdapter;
  context: RlsSessionContext;
  key: string;
  locale: "en" | "fr";
  /** Trusted scope directory used for chain validation and fallback compilation. */
  scopes: readonly unknown[];
  targetScopeId?: string;
  actor: AuthorizationActor | null;
  locals: ReaderPolicyInput["locals"];
  manifest?: unknown;
  cache?: ImmutableContentCache;
  toolEnabled?: boolean;
  moduleEnabled?: boolean;
  entitled?: boolean;
  /** Test seam: counts readerTransaction read() calls. */
  onRead?: () => void;
};

/**
 * Ordinary delivery path. Uses readerTransaction only, rechecks current policy outside the
 * immutable content cache, and never serializes raw resolver/private section bytes.
 */
export async function readPublishedContent(input: ReadPublishedContentInput): Promise<ReaderContentResult> {
  const key = resourceKeySchema.parse(input.key);
  const chain = resolveScopeChain(input.scopes, input.targetScopeId);
  const target = chain.at(-1)!;
  const manifest = input.manifest ?? COMPILED_DEFAULTS;
  const scopeChainIds = chain.map((scope) => scope.id);

  type FragmentRow = {
    releaseId: string;
    resourceId: string;
    scopeId: string;
    locale: string;
    fragmentId: string;
    kind: string;
    ordinal: number;
    minimumAudience: Audience;
    payload: Record<string, unknown>;
    controlResourceIds: string[];
  };

  let fragments: FragmentRow[] = [];
  try {
    fragments = await input.adapter.readerTransaction(input.context, async (tx) => {
      input.onRead?.();
      const batch = await tx.read("fragments", { locale: input.locale, scopeId: target.id });
      input.onRead?.();
      // Keep the batch shape stable (fragments + projections) regardless of section count.
      await tx.read("projections", { locale: input.locale, scopeId: target.id });
      return batch as FragmentRow[];
    });
  } catch {
    return { status: "unavailable", reason: "service_error" };
  }

  const matching = [...fragments]
    .filter((row) => row.locale === input.locale)
    .sort((left, right) => left.ordinal - right.ordinal || (left.fragmentId < right.fragmentId ? -1 : 1));

  const releaseIds = [...new Set(
    matching
      .filter((row) => row.fragmentId === "meta" && row.payload.key === key)
      .map((row) => row.releaseId),
  )].sort();

  if (releaseIds.length === 0) {
    // A warmed immutable compile for this exact chain means content existed; empty RLS results
    // after that are withdrawal/denial, never a silent fallback to generic copy.
    if (input.cache?.hasWarm(key, scopeChainIds, input.locale)) {
      return { status: "unavailable", reason: "withdrawn" };
    }
    return fallbackFromManifest({
      key,
      locale: input.locale,
      scopes: input.scopes,
      targetScopeId: input.targetScopeId,
      manifest,
    });
  }

  const releaseId = releaseIds[0]!;
  const permitted = matching.filter((row) => row.releaseId === releaseId);
  const compiledFragments: CompiledDeliveryFragment[] = permitted.map((row) => ({
    fragmentId: row.fragmentId,
    kind: row.kind,
    ordinal: row.ordinal,
    minimumAudience: row.minimumAudience,
    payload: row.payload,
    controlResourceIds: row.controlResourceIds,
  }));

  const resourceAudience = (permitted.find((row) => row.fragmentId === "meta")?.minimumAudience ?? "public") as Audience;
  const decision = decideCustomizationRead({
    actor: input.actor,
    target,
    scopes: input.scopes,
    locals: input.locals,
    policies: [{ audience: resourceAudience, enabled: true, editableFields: [] }],
    audience: resourceAudience,
    toolEnabled: input.toolEnabled,
    moduleEnabled: input.moduleEnabled,
    entitled: input.entitled,
    allowDemoActor: true,
  });
  if (!decision.allowed) return { status: "unavailable", reason: "denied" };

  const dependencyManifest = buildDependencyManifest({ [key]: releaseId });
  const cacheKey = buildContentCacheKey({
    resourceKey: key,
    scopeChainIds,
    locale: input.locale,
    schemaVersion: SCHEMA_VERSION,
    dependencyManifest,
    releaseId,
  });

  if (input.cache) {
    const cached = input.cache.get(cacheKey);
    if (cached && cached.releaseId === releaseId) {
      const permittedIds = new Set(compiledFragments.map((fragment) => fragment.fragmentId));
      const projected = cached.fragments.filter((fragment) => permittedIds.has(fragment.fragmentId));
      const dto = assembleAuthorizedDto(key, input.locale, projected.length ? projected : compiledFragments);
      return dto ? { status: "resolved", content: dto, releaseId } : { status: "unavailable", reason: "denied" };
    }
    const warm: CachedCompiledContent = {
      releaseId,
      resourceKey: key,
      locale: input.locale,
      schemaVersion: SCHEMA_VERSION,
      dependencyDigest: cacheKey,
      scopeChainIds,
      fragments: compiledFragments,
    };
    input.cache.set(cacheKey, warm);
  }

  const dto = assembleAuthorizedDto(key, input.locale, compiledFragments);
  return dto ? { status: "resolved", content: dto, releaseId } : { status: "unavailable", reason: "denied" };
}

/** Warm the immutable cache from a compiler result. Does not grant reader access. */
export function warmCompiledContentCache(
  cache: ImmutableContentCache,
  input: {
    resourceKey: string;
    scopeChainIds: readonly string[];
    locale: "en" | "fr";
    releaseId: string;
    dependencyManifest: Readonly<Record<string, string>>;
    fragments: readonly CompiledDeliveryFragment[];
  },
): string {
  const key = buildContentCacheKey({
    resourceKey: input.resourceKey,
    scopeChainIds: input.scopeChainIds,
    locale: input.locale,
    dependencyManifest: input.dependencyManifest,
    releaseId: input.releaseId,
  });
  cache.set(key, {
    releaseId: input.releaseId,
    resourceKey: input.resourceKey,
    locale: input.locale,
    schemaVersion: SCHEMA_VERSION,
    dependencyDigest: key,
    scopeChainIds: input.scopeChainIds,
    fragments: input.fragments,
  });
  return key;
}
