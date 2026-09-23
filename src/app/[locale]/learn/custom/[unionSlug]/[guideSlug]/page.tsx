import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { loadCustomizationContent } from "@/lib/customization/deliver-server";
import { AuthorizedGuideView } from "@/components/customization/AuthorizedGuideView";
import { getAllTenantSeeds } from "@/lib/tenant/loader";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ locale: string; unionSlug: string; guideSlug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, unionSlug, guideSlug } = await params;
  const seed = getAllTenantSeeds().find((entry) => entry.union.slug === unionSlug);
  if (!seed) {
    return {
      title: "Custom guide",
      robots: { index: false, follow: false },
    };
  }
  const system = { id: "system", kind: "system" as const, archived: false };
  const unionScope = {
    id: `union-${seed.union.id}`,
    kind: "union" as const,
    unionId: seed.union.id,
    parentScopeId: "system",
    archived: false,
  };
  const result = await loadCustomizationContent({
    key: `guide:${guideSlug}`,
    locale: locale === "fr" ? "fr" : "en",
    targetScopeId: unionScope.id,
    scopes: [system, unionScope],
    context: { unionId: seed.union.id },
  });
  const title = result.status === "resolved" && "title" in result.content
    ? result.content.title
    : `Custom guide · ${guideSlug}`;
  return {
    title,
    alternates: { canonical: `/${locale}/learn/custom/${unionSlug}/${guideSlug}` },
    robots: { index: false, follow: false },
  };
}

export default async function CustomGuidePage({ params }: Params) {
  const { locale, unionSlug, guideSlug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("hub.platformOperator.customization");
  const ts = await getTranslations("sources");

  const seed = getAllTenantSeeds().find((entry) => entry.union.slug === unionSlug);
  if (!seed) notFound();

  const system = { id: "system", kind: "system" as const, archived: false };
  const unionScope = {
    id: `union-${seed.union.id}`,
    kind: "union" as const,
    unionId: seed.union.id,
    parentScopeId: "system",
    archived: false,
  };

  const result = await loadCustomizationContent({
    key: `guide:${guideSlug}`,
    locale: locale === "fr" ? "fr" : "en",
    targetScopeId: unionScope.id,
    scopes: [system, unionScope],
    context: { unionId: seed.union.id },
  });

  if (result.status !== "resolved" || !("blocks" in result.content)) {
    notFound();
  }

  return (
    <AuthorizedGuideView
      content={result.content}
      subtitle={t("customGuideSubtitle", { union: seed.union.name })}
      tocLabel={t("customGuideToc")}
      sourcesLabel={ts("title")}
    />
  );
}
