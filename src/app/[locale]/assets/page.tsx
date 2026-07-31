import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { AssetPackPanel } from "@/components/comms/AssetPackPanel";
import { GuideLayout } from "@/components/comms/GuideLayout";

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
    <GuideLayout
      title={t("title")}
      intro={t("description")}
      footer={
        <SourcesBlock pageId="assets" title={ts("title")} intro={ts("intro")} />
      }
    >
      <AssetPackPanel />
    </GuideLayout>
  );
}
