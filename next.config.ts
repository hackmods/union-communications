import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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
    return [
      {
        source: "/:locale/guide/materials/",
        destination: "/:locale/guide/resources/",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
