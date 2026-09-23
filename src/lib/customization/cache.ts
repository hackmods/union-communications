import { dependencyManifestDigest } from "@/lib/customization/dependencies";
import { SCHEMA_VERSION } from "@/lib/customization/schemas";
import type { CompiledDeliveryFragment } from "@/lib/customization/types";

export const CONTENT_CACHE_BUDGET_BYTES = 32 * 1024 * 1024;

export type ContentCacheKeyInput = {
  resourceKey: string;
  /** Exact resolved scope chain IDs from system to target, never a client-asserted subset. */
  scopeChainIds: readonly string[];
  locale: "en" | "fr";
  schemaVersion?: number;
  dependencyManifest: Readonly<Record<string, string>>;
  releaseId: string;
};

export type CachedCompiledContent = {
  releaseId: string;
  resourceKey: string;
  locale: "en" | "fr";
  schemaVersion: number;
  dependencyDigest: string;
  scopeChainIds: readonly string[];
  /** All-audience immutable fragments. Actor filtering happens outside this cache. */
  fragments: readonly CompiledDeliveryFragment[];
};

export function buildContentCacheKey(input: ContentCacheKeyInput): string {
  const schemaVersion = input.schemaVersion ?? SCHEMA_VERSION;
  const digest = dependencyManifestDigest(input.dependencyManifest);
  return [
    input.resourceKey,
    input.scopeChainIds.join(">"),
    input.locale,
    `schema:${schemaVersion}`,
    `deps:${digest}`,
    `release:${input.releaseId}`,
  ].join("|");
}

function estimateBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

/**
 * Process-local LRU for immutable compiled fragments.
 * Never store actor decisions, membership, or final private DTOs here.
 */
export class ImmutableContentCache {
  private readonly entries = new Map<string, { value: CachedCompiledContent; bytes: number }>();
  private usedBytes = 0;
  constructor(private readonly budgetBytes = CONTENT_CACHE_BUDGET_BYTES) {}

  get size(): number {
    return this.entries.size;
  }

  get bytes(): number {
    return this.usedBytes;
  }

  get(key: string): CachedCompiledContent | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return structuredClone(entry.value);
  }

  set(key: string, value: CachedCompiledContent): void {
    const bytes = estimateBytes(value);
    if (bytes > this.budgetBytes) throw new Error("Compiled content exceeds the process cache budget");
    const existing = this.entries.get(key);
    if (existing) {
      this.usedBytes -= existing.bytes;
      this.entries.delete(key);
    }
    while (this.usedBytes + bytes > this.budgetBytes && this.entries.size > 0) {
      const oldest = this.entries.keys().next().value!;
      const removed = this.entries.get(oldest)!;
      this.entries.delete(oldest);
      this.usedBytes -= removed.bytes;
    }
    this.entries.set(key, { value: structuredClone(value), bytes });
    this.usedBytes += bytes;
  }

  clear(): void {
    this.entries.clear();
    this.usedBytes = 0;
  }

  /** True when any immutable compile was warmed for this resource/chain/locale. */
  hasWarm(resourceKey: string, scopeChainIds: readonly string[], locale: "en" | "fr"): boolean {
    const prefix = `${resourceKey}|${scopeChainIds.join(">")}|${locale}|`;
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) return true;
    }
    return false;
  }
}
