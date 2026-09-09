import type { Metadata } from "next";
import { auth } from "@/auth";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";
import { CatalogStartHerePanel } from "@/components/comms/CatalogStartHerePanel";
import { GuideLinkList } from "@/components/comms/GuideSurfaces";
import {
  learnGroups,
  visibleToolGroups,
} from "@/components/layout/nav/nav-config";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import {
  FIRST_WEEK_STEP_KEYS,
  FIRST_WEEK_STEP_LINKS,
  type FirstWeekStepKey,
} from "@/lib/comms/first-week-roadmap";
import { TOOL_COMPOSITION } from "@/lib/constants/page-composition";
import { PUBLIC_PAGE_TITLE_CLASS } from "@/lib/constants/public-type";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/tools", params);
}

export default async function ToolsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("toolsIndex");
  const nav = await getTranslations("nav");
  const plan = await getTranslations("socialMediaPlan");
  const session = await auth();
  const groups = visibleToolGroups({
    officerHubPublic: isOfficerHubPublic(),
    authenticated: Boolean(session?.user),
  });
  const channelGuides = learnGroups.find(
    (g) => g.labelKey === "learnGroupChannels",
  )?.links;

  const steps = FIRST_WEEK_STEP_KEYS.map((key: FirstWeekStepKey) => ({
    href: FIRST_WEEK_STEP_LINKS[key].primary,
    label: plan(`steps.${key}.navLabel`),
    title: plan(`steps.${key}.title`),
  }));

  const startHerePanel = (
    <CatalogStartHerePanel
      title={t("startHereTitle")}
      intro={t("startHereIntro")}
      roadmapLabel={t("startHereRoadmap")}
      roadmapHref="/guide/social-media-plan"
      steps={steps}
    />
  );

  return (
    <ComposedPageLayout
      composition={TOOL_COMPOSITION.catalog.composition}
      size={TOOL_COMPOSITION.catalog.shell}
      className="py-8 md:py-12"
      rail={startHerePanel}
    >
      <header>
        <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("title")}</h1>
        <p className="mt-2 max-w-prose text-gray-600">{t("subtitle")}</p>
        <p className="mt-2 max-w-prose text-sm text-gray-600">
          {t("hint")}{" "}
          <Link
            href="/brand-kit"
            className="font-medium text-opseu-blue underline underline-offset-2"
          >
            {nav("brandKit")}
          </Link>
          .
        </p>
      </header>

      <details className="group mt-6 rounded-xl border border-opseu-blue/15 bg-opseu-blue/[0.04] lg:hidden">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-opseu-dark outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            {t("startHereTitle")}
            <span
              className="text-xs font-normal text-gray-500 group-open:hidden"
              aria-hidden
            >
              ▼
            </span>
            <span
              className="hidden text-xs font-normal text-gray-500 group-open:inline"
              aria-hidden
            >
              ▲
            </span>
          </span>
        </summary>
        <div className="border-t border-opseu-blue/10 px-4 pb-4 pt-2">
          <CatalogStartHerePanel
            title={t("startHereTitle")}
            intro={t("startHereIntro")}
            roadmapLabel={t("startHereRoadmap")}
            roadmapHref="/guide/social-media-plan"
            steps={steps}
            bare
          />
        </div>
      </details>

      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 xl:grid-cols-5 xl:gap-8">
        {groups.map((group) => (
          <section
            key={group.labelKey}
            aria-labelledby={`tools-${group.labelKey}`}
          >
            <h2
              id={`tools-${group.labelKey}`}
              className="text-sm font-semibold uppercase tracking-wide text-gray-500"
            >
              {nav(group.labelKey)}
            </h2>
            <ul className="mt-3 space-y-3">
              {group.links.map(({ href, key }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group block rounded-lg border border-transparent px-1 py-1 transition-colors hover:border-opseu-blue/15 hover:bg-opseu-blue/5"
                  >
                    <span className="inline-flex min-h-11 items-center font-medium text-opseu-blue underline-offset-2 group-hover:underline">
                      {nav(key)}
                    </span>
                    <span className="mt-0.5 block text-sm text-gray-600">
                      {t(`blurbs.${key}`)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section
        className="mt-10 rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.06] via-white to-opseu-blue/[0.04] p-5 sm:p-6"
        aria-labelledby="tools-labour-playbooks"
      >
        <h2
          id="tools-labour-playbooks"
          className="text-sm font-semibold uppercase tracking-wide text-gray-500"
        >
          {t("labourPlaybooksTitle")}
        </h2>
        <p className="mt-2 max-w-prose text-sm text-gray-600">
          {t("labourPlaybooksIntro")}
        </p>
        <p className="mt-4">
          <Link
            href="/guide/steward-playbooks"
            className="inline-flex min-h-11 items-center font-semibold text-opseu-blue underline-offset-2 hover:underline"
          >
            {t("labourPlaybooksCta")} →
          </Link>
        </p>
      </section>

      {channelGuides ? (
        <section
          className="mt-10 border-t border-gray-200 pt-8"
          aria-labelledby="tools-channel-guides"
        >
          <h2
            id="tools-channel-guides"
            className="text-sm font-semibold uppercase tracking-wide text-gray-500"
          >
            {t("channelGuidesTitle")}
          </h2>
          <p className="mt-2 max-w-prose text-sm text-gray-600">
            {t("channelGuidesIntro")}
          </p>
          <nav className="mt-3" aria-label={t("channelGuidesTitle")}>
            <GuideLinkList
              links={channelGuides.map((link) => ({
                href: link.href,
                label: nav(link.key),
              }))}
            />
          </nav>
        </section>
      ) : null}
    </ComposedPageLayout>
  );
}
