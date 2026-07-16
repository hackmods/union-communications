import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  async headers() {
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
