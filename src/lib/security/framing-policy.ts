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

/** Paths the Viewport Lab must refuse to navigate into (match auth framing). */
export const VIEWPORT_LAB_BLOCKED_PATH_PREFIXES = [
  "/viewport-lab",
  "/app",
  "/portal",
  "/api",
] as const;
