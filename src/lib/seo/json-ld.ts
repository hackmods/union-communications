import {
  ICON_512_PATH,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from "@/lib/seo/site";

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl(ICON_512_PATH),
    slogan: "Solidarity.",
    description: SITE_DESCRIPTION,
  };
}

export function buildWebApplicationJsonLd(locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CAD",
    },
    inLanguage: ["en", "fr"],
    description: SITE_DESCRIPTION,
    image: absoluteUrl(ICON_512_PATH),
    isAccessibleForFree: true,
    ...(locale === "fr"
      ? { availableLanguage: ["French", "English"] }
      : { availableLanguage: ["English", "French"] }),
  };
}

export function buildSiteJsonLdGraph(locale: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [buildOrganizationJsonLd(), buildWebApplicationJsonLd(locale)],
  };
}
