import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { OFFICER_LEARNING_MODULES } from "@/lib/officer-learning/modules";
import { OfficerLearningDashboard } from "@/components/officer-learning/OfficerLearningDashboard";
import { SourcesBlock } from "@/components/comms/SourcesBlock";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/officer-learning", params);
}

export default async function OfficerLearningPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ts = await getTranslations("sources");
  const t = await getTranslations("officerLearning");

  return (
    <>
      <OfficerLearningDashboard modules={OFFICER_LEARNING_MODULES} />
      <div className="bg-[#0B132B] px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow-lg md:p-8">
          <p className="mb-4 text-sm text-gray-600">{t("sourcesIntro")}</p>
          <SourcesBlock pageId="officerLearning" title={ts("title")} intro={ts("intro")} />
        </div>
      </div>
    </>
  );
}
