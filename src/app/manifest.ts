import type { MetadataRoute } from "next";
import { BRAND_COLORS } from "@/lib/constants/brand";
import { OG_IMAGE_STATIC_PATH, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/en/app/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: BRAND_COLORS.primary,
    lang: "en",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: OG_IMAGE_STATIC_PATH,
        sizes: "1200x630",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
