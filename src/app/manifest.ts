import type { MetadataRoute } from "next";
import { cookies } from "next/headers";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { buildWebManifest } from "@/lib/pwa/manifest";
import {
  normalizePwaThemeColor,
  PWA_THEME_COOKIE,
} from "@/lib/pwa/brand-chrome";
import { BRAND_COLORS } from "@/lib/constants/brand";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const jar = await cookies();
  const fromCookie = jar.get(PWA_THEME_COOKIE)?.value;
  const themeColor = normalizePwaThemeColor(
    fromCookie ? decodeURIComponent(fromCookie) : undefined,
    BRAND_COLORS.primary,
  );

  return buildWebManifest({
    officerHubPublic: isOfficerHubPublic(),
    themeColor,
  });
}
