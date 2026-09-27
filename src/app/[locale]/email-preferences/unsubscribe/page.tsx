import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductNewsTokenAction } from "@/components/product-news/ProductNewsTokenAction";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function UnsubscribeProductNewsPage({
  params, searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token: rawToken } = await searchParams;
  const token = typeof rawToken === "string" ? rawToken : undefined;
  const t = await getTranslations({ locale, namespace: "productNews" });
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:py-16">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("unsubscribeTitle")}</h1>
      <p className="mt-3 text-opseu-gray-dark">{t("unsubscribeBody")}</p>
      {token ? <ProductNewsTokenAction token={token} action="unsubscribe" />
        : <p role="alert" className="mt-6">{t("expired")}</p>}
    </main>
  );
}
