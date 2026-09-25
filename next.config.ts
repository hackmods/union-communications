import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import createNextIntlPlugin from "next-intl/plugin";
import { PUBLIC_ROUTE_REDIRECTS } from "./src/lib/seo/public-routes";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Build the `experimental.serverActions.allowedOrigins` allow-list.
 *
 * Server actions in Next.js 16 reject POSTs from origins not in this list —
 * it's the framework-level defence against cross-origin action replay. We
 * derive the list from `AUTH_URL` (canonical deployment origin) plus an
 * optional `NEXT_PUBLIC_BASE_URL` (the public-facing reverse-proxy origin
 * used by CapRover / multi-host setups). Duplicates and empty values are
 * dropped so the list stays tight.
 */
function resolveAllowedOrigins(): string[] {
  const candidates = [
    process.env.AUTH_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXTAUTH_URL,
    "http://localhost:3000",
  ];
  const seen = new Set<string>();
  const allowed: string[] = [];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const host = new URL(raw).origin;
      if (!seen.has(host)) {
        seen.add(host);
        allowed.push(host);
      }
    } catch {
      // Bad URL in env — skip silently; entrypoint sanity check is on the
      // operator, not on the bundler.
    }
  }
  return allowed;
}

/** Security headers applied on every host (Vercel, CapRover, Docker) — SEC-008. */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    // camera=(self) — Officer Hub profile photo capture (getUserMedia).
    value: "camera=(self), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "worker-src 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  experimental: {
    /**
     * Restrict server-action POSTs to origins we actually deploy on. Locks
     * down the "Failed to find Server Action …" surface (which can be probed
     * cross-origin in older Next versions) to the canonical hosts. Set
     * `SERVER_ACTIONS_ALLOW_ALL_ORIGINS=true` only in test environments.
     */
    serverActions: {
      allowedOrigins: process.env.SERVER_ACTIONS_ALLOW_ALL_ORIGINS === "true"
        ? undefined
        : resolveAllowedOrigins(),
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    const longCache = [
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      },
    ];
    return [
      {
        // Always revalidate the worker script so byte-identical updates apply
        // cleanly; avoids Edge installed PWAs sticking on a poisoned SW.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      // Static trees under public/assets/ only — do not long-cache the
      // locale-less /assets/ page redirect (GSC + CapRover host poison).
      { source: "/assets/unions/:path*", headers: longCache },
      { source: "/assets/caat-opseu/:path*", headers: longCache },
      { source: "/assets/unionops/:path*", headers: longCache },
      { source: "/assets/ontario-board-posters/:path*", headers: longCache },
      { source: "/assets/website-heroes/:path*", headers: longCache },
      { source: "/icons/:path*", headers: longCache },
      { source: "/demo/:path*", headers: longCache },
      { source: "/templates/:path*", headers: longCache },
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  async redirects() {
    return [...PUBLIC_ROUTE_REDIRECTS];
  },
  async rewrites() {
    return [
      {
        source: "/:locale(en|fr)/create/brand-kit/",
        destination: "/:locale/brand-kit/",
      },
      {
        source: "/:locale(en|fr)/create/",
        destination: "/:locale/tools/",
      },
      {
        source: "/:locale(en|fr)/create/:slug/",
        destination: "/:locale/tools/:slug/",
      },
      {
        source: "/:locale(en|fr)/utilities/:slug/",
        destination: "/:locale/tools/:slug/",
      },
      {
        source: "/:locale(en|fr)/learn/communications-blueprint/",
        destination: "/:locale/guide/",
      },
      {
        source: "/:locale(en|fr)/learn/first-week/",
        destination: "/:locale/guide/social-media-plan/",
      },
      {
        source: "/:locale(en|fr)/learn/steward/",
        destination: "/:locale/guide/steward-playbooks/",
      },
      {
        source: "/:locale(en|fr)/learn/officer/:slug/",
        destination: "/:locale/guide/officer-learning/:slug/",
      },
      {
        source: "/:locale(en|fr)/learn/officer/",
        destination: "/:locale/guide/officer-learning/",
      },
      {
        source: "/:locale(en|fr)/learn/workshops/comms/",
        destination: "/:locale/guide/workshop/",
      },
      {
        source: "/:locale(en|fr)/learn/workshops/:slug/",
        destination: "/:locale/guide/workshops/:slug/",
      },
      {
        source: "/:locale(en|fr)/learn/workshops/",
        destination: "/:locale/guide/workshops/",
      },
      {
        source: "/:locale(en|fr)/learn/library/",
        destination: "/:locale/library/",
      },
      {
        source: "/:locale(en|fr)/learn/library/examples/",
        destination: "/:locale/examples/",
      },
      {
        source: "/:locale(en|fr)/learn/library/captions/",
        destination: "/:locale/captions/",
      },
      {
        source: "/:locale(en|fr)/learn/library/brand-assets/",
        destination: "/:locale/assets/",
      },
      {
        source: "/:locale(en|fr)/learn/",
        destination: "/:locale/guides/",
      },
      {
        source: "/:locale(en|fr)/learn/:slug/",
        destination: "/:locale/guide/:slug/",
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG || "union-ops",
  project: process.env.SENTRY_PROJECT || "javascript-nextjs",
  silent: !process.env.CI,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
  // Source maps are optional — never fail CapRover / local builds without a token.
  errorHandler: (err) => {
    console.warn("[sentry] build plugin:", err.message);
  },
});
