import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { AssetPackPanel } from "@/components/comms/AssetPackPanel";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";

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
    <ComposedPageLayout composition="hub" size="wide" className="py-8 md:py-12">
      <header className="max-w-3xl lg:max-w-none">
        <h1 className="text-2xl font-bold tracking-tight text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-prose leading-relaxed text-gray-700 lg:max-w-3xl">
          {t("description")}
        </p>
      </header>

      <div className="mt-10">
        <AssetPackPanel />
      </div>

      <SourcesBlock pageId="assets" title={ts("title")} intro={ts("intro")} />
    </ComposedPageLayout>
  );
}
