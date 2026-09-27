import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductNewsPreferencesPanel } from "@/components/product-news/ProductNewsPreferencesPanel";
import { PRODUCT_NEWS_NOTICE, PRODUCT_NEWS_NOTICE_VERSION, readProductNewsConfig } from "@/lib/email/product-news-config";
import { productNewsPreferenceState } from "@/lib/email/product-news-subscriptions";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function EmailPreferencesPage({
  params, searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "fr" ? "fr" : "en";
  setRequestLocale(locale);
  const { token: rawToken } = await searchParams;
  const token = typeof rawToken === "string" ? rawToken : undefined;
  const t = await getTranslations({ locale, namespace: "productNews" });
  const config = readProductNewsConfig();
  const current = token ? await productNewsPreferenceState(token).catch(() => null) : null;
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-16">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-3 text-opseu-gray-dark">{t("intro")}</p>
      <div className="mt-8">
        <ProductNewsPreferencesPanel locale={locale} enabled={config.enabled}
          notice={PRODUCT_NEWS_NOTICE[locale]} noticeVersion={PRODUCT_NEWS_NOTICE_VERSION}
          token={token} current={current} />
      </div>
    </main>
  );
}
