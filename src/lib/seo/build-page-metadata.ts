import type { Metadata } from "next";
import {
  APPLE_TOUCH_ICON_PATH,
  FAVICON_ICO_PATH,
  FAVICON_SVG_PATH,
  ICON_48_PATH,
  ICON_192_PATH,
  ICON_512_PATH,
  OG_IMAGE_PATH,
  SITE_NAME,
  SITE_URL,
  TWITTER_IMAGE_PATH,
  absoluteUrl,
  localePath,
  type AppLocale,
} from "@/lib/seo/site";

type BuildPageMetadataOptions = {
  locale: string;
  /** Path without locale, e.g. `/` or `/tools/logo-builder` */
  path?: string;
  title: string;
  description: string;
  /** Use absolute title (no `| UnionOps` template). */
  absoluteTitle?: boolean;
  ogType?: "website" | "article";
  imageAlt?: string;
  noIndex?: boolean;
};

export function buildPageMetadata({
  locale,
  path = "/",
  title,
  description,
  absoluteTitle = false,
  ogType = "website",
  imageAlt = `${SITE_NAME} - Solidarity.`,
  noIndex = false,
}: BuildPageMetadataOptions): Metadata {
  const loc = (locale === "fr" ? "fr" : "en") as AppLocale;
  const pagePath = localePath(loc, path);
  const url = absoluteUrl(pagePath);
  const enUrl = absoluteUrl(localePath("en", path));
  const frUrl = absoluteUrl(localePath("fr", path));
  const ogTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: enUrl,
        fr: frUrl,
        "x-default": enUrl,
      },
    },
    openGraph: {
      type: ogType,
      url,
      siteName: SITE_NAME,
      title: ogTitle,
      description,
      locale: loc === "fr" ? "fr_CA" : "en_CA",
      alternateLocale: loc === "fr" ? ["en_CA"] : ["fr_CA"],
      images: [
        {
          url: OG_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [TWITTER_IMAGE_PATH],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    icons: {
      icon: [
        // SVG first — supports prefers-color-scheme black/white contrast
        { url: FAVICON_SVG_PATH, type: "image/svg+xml" },
        { url: ICON_48_PATH, sizes: "48x48", type: "image/png" },
        { url: FAVICON_ICO_PATH, sizes: "32x32", type: "image/x-icon" },
        { url: ICON_192_PATH, sizes: "192x192", type: "image/png" },
        { url: ICON_512_PATH, sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: APPLE_TOUCH_ICON_PATH, sizes: "180x180", type: "image/png" }],
    },
    metadataBase: new URL(SITE_URL),
  };
}
