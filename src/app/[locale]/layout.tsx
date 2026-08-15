import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BrandProvider } from "@/components/providers/BrandProvider";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import { PreferencesInitScript } from "@/components/providers/PreferencesInitScript";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SkipLink } from "@/components/layout/SkipLink";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildSiteJsonLdGraph } from "@/lib/seo/json-ld";
import { SAFARI_PINNED_TAB_COLOR, SAFARI_PINNED_TAB_PATH } from "@/lib/seo/site";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { canvasFontVariablesClassName } from "@/app/canvas-fonts";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Locale shell only: default title + template + description.
 * Do not set canonical/hreflang here — child pages own their path via
 * `buildPageMetadata` / `buildPublicPageMetadata` / tool layouts.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const hubPublic = isOfficerHubPublic();
  const title = hubPublic ? t("title") : t("titleCommsOnly");
  const description = hubPublic ? t("description") : t("descriptionCommsOnly");

  return {
    title: {
      default: title,
      template: `%s | UnionOps`,
    },
    description,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en" | "fr")) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  // PreferencesInitScript may set data-* prefs on <html> before hydrate (FOUC).
  return (
    <html
      lang={locale}
      className={`h-full ${canvasFontVariablesClassName}`}
      suppressHydrationWarning
    >
      <head>
        <PreferencesInitScript />
        <link
          rel="mask-icon"
          href={SAFARI_PINNED_TAB_PATH}
          color={SAFARI_PINNED_TAB_COLOR}
        />
        <JsonLd data={buildSiteJsonLdGraph(locale)} />
      </head>
      <body className="flex min-h-full flex-col antialiased" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <BrandProvider>
              <PreferencesProvider>
                <SkipLink />
                <Header />
                <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
                  {children}
                </main>
                <Footer />
                <ServiceWorkerRegister />
              </PreferencesProvider>
            </BrandProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
