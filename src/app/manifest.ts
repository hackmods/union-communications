import type { MetadataRoute } from "next";
import { cookies, headers } from "next/headers";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import {
  buildWebManifest,
  PWA_LOCALE_COOKIE,
  resolvePwaManifestLocale,
} from "@/lib/pwa/manifest";
import {
  normalizePwaThemeColor,
  PWA_THEME_COOKIE,
} from "@/lib/pwa/brand-chrome";
import { BRAND_COLORS } from "@/lib/constants/brand";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const jar = await cookies();
  const hdrs = await headers();
  const fromCookie = jar.get(PWA_THEME_COOKIE)?.value;
  const themeColor = normalizePwaThemeColor(
    fromCookie ? decodeURIComponent(fromCookie) : undefined,
    BRAND_COLORS.primary,
  );
  const locale = resolvePwaManifestLocale({
    cookieLocale: jar.get(PWA_LOCALE_COOKIE)?.value,
    acceptLanguage: hdrs.get("accept-language"),
  });

  return buildWebManifest({
    officerHubPublic: isOfficerHubPublic(),
    themeColor,
    locale,
  });
}
