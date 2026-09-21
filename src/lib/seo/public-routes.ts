/**
 * Public URL transition map. Route handlers continue to live in their current
 * App Router folders while canonical URLs move to the task-first structure.
 * Keep this table in sync with `next.config.ts` redirects and rewrites.
 */
const STATIC_CANONICAL_PATHS: Record<string, string> = {
  "/onboarding": "/start",
  "/brand-kit": "/create/brand-kit",
  "/tools": "/create",
  "/guides": "/learn",
  "/guide": "/learn/communications-blueprint",
  "/guide/social-media-plan": "/learn/first-week",
  "/guide/steward-playbooks": "/learn/steward",
  "/guide/officer-learning": "/learn/officer",
  "/guide/materials": "/learn/resources",
  "/learn/materials": "/learn/resources",
  "/guide/workshops": "/learn/workshops",
  "/guide/workshop": "/learn/workshops/comms",
  "/guide/workshops/land-acknowledgement":
    "/learn/workshops/land-acknowledgement",
  "/examples": "/learn/library/examples",
  "/captions": "/learn/library/captions",
  "/assets": "/learn/library/brand-assets",
  "/guide/pdf-classification": "/learn/officer/pdf-classification",
  "/tools/share-kit": "/create/graphic-maker",
};

export type PermanentPublicRedirect = {
  source: string;
  destination: string;
  permanent: true;
  has?: { type: "query"; key: string }[];
  missing?: { type: "query"; key: string }[];
};

const LOCALE = "/:locale";
const LOCALE_SOURCE = `${LOCALE}(en|fr)`;

/**
 * Permanent public redirects. Next preserves source query parameters when
 * they are not replaced by a destination parameter. The onboarding split
 * preserves a caller-supplied step while defaulting old links to Brand Kit.
 */
export const PUBLIC_ROUTE_REDIRECTS: readonly PermanentPublicRedirect[] = [
  {
    source: `${LOCALE_SOURCE}/onboarding/`,
    destination: `${LOCALE}/start/`,
    has: [{ type: "query", key: "step" }],
    permanent: true,
  },
  {
    source: `${LOCALE_SOURCE}/onboarding/`,
    destination: `${LOCALE}/start/?step=brand`,
    missing: [{ type: "query", key: "step" }],
    permanent: true,
  },
  { source: `${LOCALE_SOURCE}/brand-kit/`, destination: `${LOCALE}/create/brand-kit/`, permanent: true },
  { source: `${LOCALE_SOURCE}/tools/share-kit/`, destination: `${LOCALE}/create/graphic-maker/`, permanent: true },
  { source: `${LOCALE_SOURCE}/tools/`, destination: `${LOCALE}/create/`, permanent: true },
  { source: `${LOCALE_SOURCE}/tools/:slug/`, destination: `${LOCALE}/create/:slug/`, permanent: true },
  { source: `${LOCALE_SOURCE}/guides/`, destination: `${LOCALE}/learn/`, permanent: true },
  { source: `${LOCALE_SOURCE}/guide/officer-learning/:slug/`, destination: `${LOCALE}/learn/officer/:slug/`, permanent: true },
  { source: `${LOCALE_SOURCE}/guide/officer-learning/`, destination: `${LOCALE}/learn/officer/`, permanent: true },
  { source: `${LOCALE_SOURCE}/guide/workshops/land-acknowledgement/`, destination: `${LOCALE}/learn/workshops/land-acknowledgement/`, permanent: true },
  { source: `${LOCALE_SOURCE}/guide/workshops/:slug/`, destination: `${LOCALE}/learn/workshops/:slug/`, permanent: true },
  { source: `${LOCALE_SOURCE}/guide/workshops/`, destination: `${LOCALE}/learn/workshops/`, permanent: true },
  { source: `${LOCALE_SOURCE}/guide/workshop/`, destination: `${LOCALE}/learn/workshops/comms/`, permanent: true },
  { source: `${LOCALE_SOURCE}/guide/social-media-plan/`, destination: `${LOCALE}/learn/first-week/`, permanent: true },
  { source: `${LOCALE_SOURCE}/guide/steward-playbooks/`, destination: `${LOCALE}/learn/steward/`, permanent: true },
  { source: `${LOCALE_SOURCE}/guide/materials/`, destination: `${LOCALE}/learn/resources/`, permanent: true },
  { source: `${LOCALE_SOURCE}/learn/materials/`, destination: `${LOCALE}/learn/resources/`, permanent: true },
  { source: `${LOCALE_SOURCE}/guide/pdf-classification/`, destination: `${LOCALE}/learn/officer/pdf-classification/`, permanent: true },
  { source: `${LOCALE_SOURCE}/guide/`, destination: `${LOCALE}/learn/communications-blueprint/`, permanent: true },
  { source: `${LOCALE_SOURCE}/guide/:path*/`, destination: `${LOCALE}/learn/:path*/`, permanent: true },
  { source: `${LOCALE_SOURCE}/examples/`, destination: `${LOCALE}/learn/library/examples/`, permanent: true },
  { source: `${LOCALE_SOURCE}/captions/`, destination: `${LOCALE}/learn/library/captions/`, permanent: true },
  { source: `${LOCALE_SOURCE}/assets/`, destination: `${LOCALE}/learn/library/brand-assets/`, permanent: true },
];

/** Return the new canonical path for an old public path, without query/hash. */
export function canonicalPublicPath(path: string): string {
  const normalized = path.length > 1 ? path.replace(/\/+$/, "") : path;
  const exact = STATIC_CANONICAL_PATHS[normalized];
  if (exact) return exact;

  if (normalized.startsWith("/tools/")) {
    return `/create/${normalized.slice("/tools/".length)}`;
  }
  if (normalized.startsWith("/guide/officer-learning/")) {
    return `/learn/officer/${normalized.slice("/guide/officer-learning/".length)}`;
  }
  if (normalized.startsWith("/guide/workshops/")) {
    return `/learn/workshops/${normalized.slice("/guide/workshops/".length)}`;
  }
  if (normalized.startsWith("/guide/")) {
    return `/learn/${normalized.slice("/guide/".length)}`;
  }

  return normalized;
}

/**
 * Convert an internal href to its canonical public route while preserving
 * search parameters and fragments. `/onboarding` acquires the explicit brand
 * setup step unless the caller already supplied one.
 */
export function canonicalizePublicHref(href: string): string {
  if (!href.startsWith("/")) return href;

  const hashIndex = href.indexOf("#");
  const beforeHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const queryIndex = beforeHash.indexOf("?");
  const path = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
  const rawQuery = queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : "";
  const canonical = canonicalPublicPath(path);

  const params = new URLSearchParams(rawQuery);
  if (canonical === "/start" && path.replace(/\/+$/, "") === "/onboarding" && !params.has("step")) {
    params.set("step", "brand");
  }

  const query = params.toString();
  return `${canonical}${query ? `?${query}` : ""}${hash}`;
}

/** Paths intentionally kept out of the public search experience. */
export function isPublicDiscoveryPath(path: string): boolean {
  return path.startsWith("/app") || path.startsWith("/portal") || path.startsWith("/api");
}
