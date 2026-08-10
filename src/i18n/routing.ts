import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fr"],
  defaultLocale: "en",
  localePrefix: "always",
  // HTML hreflang/canonical come from buildPageMetadata (prefixed x-default).
  // Middleware Link headers advertise unprefixed x-default and fight GSC.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
