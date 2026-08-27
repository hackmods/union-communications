import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import {
  getModuleBySlug,
  getNextModuleSlug,
  loadParsedModule,
} from "@/lib/officer-learning/modules";
import { ModuleViewer } from "@/components/officer-learning/ModuleViewer";

export async function generateStaticParams() {
  return [
    { slug: "contract-enforcement" },
    { slug: "progressive-discipline" },
    { slug: "human-rights-accommodation" },
    { slug: "democratic-governance" },
    { slug: "financial-health" },
    { slug: "building-collective-power" },
  ];
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

  const parsed = loadParsedModule(meta.id);
  const nextModuleSlug = getNextModuleSlug(slug);

  return <ModuleViewer meta={meta} module={parsed} nextModuleSlug={nextModuleSlug} />;
}
