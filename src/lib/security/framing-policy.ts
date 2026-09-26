/**
 * Path-scoped clickjacking / framing policy (SEC-008 + Viewport Lab).
 *
 * Public pages allow same-origin framing so `/viewport-lab/` can embed them.
 * Officer Hub and Local Portal stay unframeable.
 */

export const FRAME_ANCESTORS_PUBLIC = "'self'" as const;
export const FRAME_ANCESTORS_AUTH = "'none'" as const;

export const X_FRAME_OPTIONS_PUBLIC = "SAMEORIGIN" as const;
export const X_FRAME_OPTIONS_AUTH = "DENY" as const;

/** Shared CSP directives excluding frame-ancestors (varies by surface). */
export const CSP_BASE_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "worker-src 'self'",
] as const;

export function buildContentSecurityPolicy(
  frameAncestors: typeof FRAME_ANCESTORS_PUBLIC | typeof FRAME_ANCESTORS_AUTH,
): string {
  return [...CSP_BASE_DIRECTIVES, `frame-ancestors ${frameAncestors}`].join("; ");
}

export function publicSecurityHeaders(): { key: string; value: string }[] {
  return [
    { key: "X-Frame-Options", value: X_FRAME_OPTIONS_PUBLIC },
    { key: "X-Content-Type-Options", value: "nosniff" },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(self), microphone=(), geolocation=()",
    },
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(FRAME_ANCESTORS_PUBLIC),
    },
  ];
}

export function authSecurityHeaders(): { key: string; value: string }[] {
  return [
    { key: "X-Frame-Options", value: X_FRAME_OPTIONS_AUTH },
    { key: "X-Content-Type-Options", value: "nosniff" },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(self), microphone=(), geolocation=()",
    },
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(FRAME_ANCESTORS_AUTH),
    },
  ];
}

/**
 * Path sources for `next.config` headers().
 * Next.js last-match wins for duplicate header keys — keep PUBLIC catch-all
 * first and AUTH Hub/Portal sources after it.
 */
export const SECURITY_HEADER_SOURCES = {
  publicCatchAll: "/:path*",
  authApp: "/:locale(en|fr)/app/:path*",
  authPortal: "/:locale(en|fr)/portal/:path*",
} as const;

export type SecurityHeaderRoute = {
  source: string;
  headers: { key: string; value: string }[];
};

/** Ordered path-scoped framing entries for next.config (AUTH after PUBLIC). */
export function pathScopedFramingHeaderRoutes(): SecurityHeaderRoute[] {
  return [
    {
      source: SECURITY_HEADER_SOURCES.publicCatchAll,
      headers: publicSecurityHeaders(),
    },
    {
      source: SECURITY_HEADER_SOURCES.authApp,
      headers: authSecurityHeaders(),
    },
    {
      source: SECURITY_HEADER_SOURCES.authPortal,
      headers: authSecurityHeaders(),
    },
  ];
}

/** Paths the Viewport Lab must refuse to navigate into (match auth framing). */
export const VIEWPORT_LAB_BLOCKED_PATH_PREFIXES = [
  "/viewport-lab",
  "/app",
  "/portal",
  "/api",
] as const;
