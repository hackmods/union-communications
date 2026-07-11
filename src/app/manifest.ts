import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/en/app/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#003366",
    lang: "en",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/og-image.png",
        sizes: "1200x630",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
