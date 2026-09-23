import type { Audience, PublicDiscoveryDto } from "@/lib/customization/types";

const DISCOVERY_KEYS = ["key", "title", "summary", "canonicalPath"] as const;

/** Strip any non-allowlisted fields before catalog/sitemap/OG composition. */
export function sanitizePublicDiscovery(raw: unknown): PublicDiscoveryDto | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.key !== "string" || typeof row.title !== "string") return null;
  if (typeof row.summary !== "string" || typeof row.canonicalPath !== "string") return null;
  return {
    key: row.key,
    title: row.title,
    summary: row.summary,
    canonicalPath: row.canonicalPath,
  };
}

/** Public teaser cards default off — only public audience + enabled resources may appear. */
export function mayExposeInPublicCatalog(input: {
  audience: Audience;
  enabled: boolean;
  withdrawn?: boolean;
  teaserEnabled?: boolean;
}): boolean {
  if (input.withdrawn) return false;
  if (!input.enabled) return false;
  if (input.audience !== "public") return false;
  return input.teaserEnabled === true;
}

/** Compose only safe discovery entries for anonymous HTML/JSON. */
export function composePublicDiscoveryCatalog(
  rows: unknown[],
  options: { teaserEnabled?: boolean } = {},
): PublicDiscoveryDto[] {
  const out: PublicDiscoveryDto[] = [];
  for (const row of rows) {
    const dto = sanitizePublicDiscovery(row);
    if (!dto) continue;
    if (!mayExposeInPublicCatalog({
      audience: "public",
      enabled: true,
      teaserEnabled: options.teaserEnabled ?? false,
    })) continue;
    // Re-assert allowlist so leaked private keys never survive composition.
    const safe: PublicDiscoveryDto = {
      key: dto.key,
      title: dto.title,
      summary: dto.summary,
      canonicalPath: dto.canonicalPath,
    };
    for (const key of Object.keys(safe)) {
      if (!(DISCOVERY_KEYS as readonly string[]).includes(key)) {
        delete (safe as Record<string, unknown>)[key];
      }
    }
    out.push(safe);
  }
  return out;
}

export function audienceLabelKey(audience: Audience): string {
  return `audience.${audience}`;
}
