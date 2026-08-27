import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import {
  getModuleBySlug,
  getNextModuleSlug,
} from "@/lib/officer-learning/modules";
import { loadParsedModule } from "@/lib/officer-learning/load-module";
import { ModuleViewer } from "@/components/officer-learning/ModuleViewer";

const SOURCES_PAGE_BY_SLUG: Record<string, string> = {
  "contract-enforcement": "officerLearningContract",
  "progressive-discipline": "officerLearningDiscipline",
  "human-rights-accommodation": "officerLearningHumanRights",
  "democratic-governance": "officerLearningGovernance",
  "financial-health": "officerLearningFinancial",
  "building-collective-power": "officerLearningCollectivePower",
};

export async function generateStaticParams() {
  return Object.keys(SOURCES_PAGE_BY_SLUG).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const meta = getModuleBySlug(slug);
  if (!meta) return {};
  return buildPublicPageMetadata(`/guide/officer-learning/${slug}`, Promise.resolve({ locale }));
}

export default async function OfficerLearningModulePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const meta = getModuleBySlug(slug);
  if (!meta) notFound();

  const parsed = loadParsedModule(meta.id, locale);
  const nextModuleSlug = getNextModuleSlug(slug);
  const ts = await getTranslations("sources");
  const t = await getTranslations("officerLearning");
  const sourcesPageId = SOURCES_PAGE_BY_SLUG[slug] ?? "officerLearning";

  return (
    <ModuleViewer
      meta={meta}
      module={parsed}
      nextModuleSlug={nextModuleSlug}
      sourcesPageId={sourcesPageId}
      sourcesTitle={ts("title")}
      sourcesIntro={t("sourcesIntro")}
    />
  );
}
