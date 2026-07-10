import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BrandProvider } from "@/components/providers/BrandProvider";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import { PreferencesInitScript } from "@/components/providers/PreferencesInitScript";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SkipLink } from "@/components/layout/SkipLink";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
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

  return (
    <html lang={locale} className="h-full">
      <head>
        <PreferencesInitScript />
      </head>
      <body className="flex min-h-full flex-col antialiased">
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
              </PreferencesProvider>
            </BrandProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
