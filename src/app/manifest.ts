import type { MetadataRoute } from "next";
import { BRAND_COLORS } from "@/lib/constants/brand";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import {
  ICON_192_PATH,
  ICON_512_PATH,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/seo/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: isOfficerHubPublic() ? "/en/app/" : "/en/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: BRAND_COLORS.primary,
    lang: "en",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: ICON_192_PATH,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: ICON_512_PATH,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
