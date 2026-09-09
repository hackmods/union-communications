import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { guideCtaClassSm } from "@/components/comms/guideCtaClasses";
import { ResourcesSourcesList } from "@/components/comms/ResourcesSourcesList";
import {
  GUIDE_RESOURCES_COMMS_LINKS,
  GUIDE_RESOURCES_LABOUR_LINKS,
} from "@/lib/comms/guide-registry";
import {
  GuideLayout,
  GuideBulletList,
  GuideCallout,
  GuideRelatedLinkList,
  GuideSection,
} from "@/components/comms/guide-ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/resources", params);
}

const commsPathLinks = GUIDE_RESOURCES_COMMS_LINKS;
const labourPathLinks = GUIDE_RESOURCES_LABOUR_LINKS;

const exploreLinks = [
  { href: "/guide/social-media-plan", key: "cta" as const },
  { href: "/onboarding", key: "onboarding" as const },
  { href: "/tools/logo-builder", key: "logo" as const },
  { href: "/tools/board-notice", key: "board" as const },
  { href: "/tools/flyer-maker", key: "flyer" as const },
  { href: "/tools/graphic-maker", key: "graphic" as const },
  { href: "/tools/website-template", key: "website" as const },
  { href: "/guide/crisis", key: "crisis" as const },
];

export default async function ResourcesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("resources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      preset="hub"
    >
      <GuideCallout className="mb-8">
        <p className="font-semibold text-opseu-dark">{t("purpose.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("purpose.body")}</p>
        <GuideBulletList className="mt-3 space-y-2" columns={2}>
          {(t.raw("purpose.pillars") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </GuideBulletList>
        <Link href="/brand-kit" className={`mt-4 ${guideCtaClassSm}`}>
          {t("purpose.cta")}
        </Link>
      </GuideCallout>

      <GuideSection id="path" title={t("path.title")} intro={t("path.intro")}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:gap-5">
          {commsPathLinks.map(({ href, key }) => (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                className="font-medium text-opseu-blue underline"
              >
                {t(`path.links.${key}`)}
              </Link>
              <p className="mt-0.5 text-sm text-gray-600">
                {t(`path.blurb.${key}`)}
              </p>
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="labourPath"
        title={t("labourPath.title")}
        intro={t("labourPath.intro")}
        className="border-amber-500/40"
      >
        <ul className="grid gap-4 sm:grid-cols-2 lg:gap-5">
          {labourPathLinks.map(({ href, key }) => (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                className="font-medium text-opseu-blue underline"
              >
                {t(`labourPath.links.${key}`)}
              </Link>
              <p className="mt-0.5 text-sm text-gray-600">
                {t(`labourPath.blurb.${key}`)}
              </p>
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        id="checklist"
        title={t("checklist.title")}
        intro={t("checklist.intro")}
      >
        <GuideBulletList className="mt-0 space-y-2" columns={2}>
          {(t.raw("checklist.items") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </GuideBulletList>
      </GuideSection>

      <GuideSection
        id="demoKit"
        title={t("demoKit.title")}
        intro={t("demoKit.description")}
      >
        <a
          href="/demo/brand-kit-local-243.json"
          download="brand-kit-local-243.json"
          className="inline-block text-sm font-medium text-opseu-blue underline"
        >
          {t("demoKit.download")}
        </a>
      </GuideSection>

      <GuideSection id="explore" title={t("explore.title")}>
        <nav className="text-sm" aria-label={t("explore.title")}>
          <GuideRelatedLinkList
            links={exploreLinks.map(({ href, key }) => ({
              href,
              label: t(`explore.${key}`),
            }))}
          />
        </nav>
      </GuideSection>

      <GuideSection id="builtFrom" title={t("builtFrom.title")}>
        <GuideBulletList className="mt-0 space-y-2">
          {(t.raw("builtFrom.items") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </GuideBulletList>
      </GuideSection>

      <GuideSection
        id="federations"
        title={t("federations.title")}
        intro={t("federations.body")}
      />

      <ResourcesSourcesList />
    </GuideLayout>
  );
}
