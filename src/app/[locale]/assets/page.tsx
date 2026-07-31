import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { AssetPackPanel } from "@/components/comms/AssetPackPanel";
import { PageShell } from "@/components/layout/PageShell";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/assets", params);
}

export default async function AssetsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("assets");
  const ts = await getTranslations("sources");

  return (
    <PageShell size="wide" className="py-8 md:py-12">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-4 leading-relaxed text-gray-700">{t("description")}</p>
      </header>

      <div className="mt-10">
        <AssetPackPanel />
      </div>

      <SourcesBlock pageId="assets" title={ts("title")} intro={ts("intro")} />
    </PageShell>
  );
}
