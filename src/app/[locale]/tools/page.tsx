import type { Metadata } from "next";
import { auth } from "@/auth";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/tools", params);
}

function StartHerePanel({
  title,
  intro,
  roadmapLabel,
  stepLabels,
  stepTitles,
  stepLinks,
  bare = false,
}: {
  title: string;
  intro: string;
  roadmapLabel: string;
  stepLabels: string[];
  stepTitles: string[];
  stepLinks: string[];
  bare?: boolean;
}) {
  return (
    <div
      className={
        bare
          ? undefined
          : "rounded-xl border border-opseu-blue/15 bg-gradient-to-b from-opseu-blue/[0.06] to-white p-5"
      }
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-snug text-gray-700">{intro}</p>
      <ol className="mt-4 space-y-2">
        {stepLabels.map((label, index) => (
          <li key={label}>
            <Link
              href={stepLinks[index]!}
              className="group flex min-h-11 items-start gap-3 rounded-lg border border-transparent px-1 py-1 transition-colors hover:border-opseu-blue/20 hover:bg-white/80"
            >
              <span
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-opseu-blue/10 text-xs font-bold text-opseu-blue"
                aria-hidden
              >
                {index + 1}
              </span>
              <span>
                <span className="block font-medium text-opseu-blue underline-offset-2 group-hover:underline">
                  {label}
                </span>
                <span className="mt-0.5 block text-xs text-gray-600">
                  {stepTitles[index]}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-4 border-t border-opseu-blue/10 pt-4">
        <Link
          href="/guide/social-media-plan"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-opseu-blue underline-offset-2 hover:underline"
        >
          {roadmapLabel} →
        </Link>
      </p>
    </div>
  );
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

  const stepLabels = FIRST_WEEK_STEP_KEYS.map((key: FirstWeekStepKey) =>
    plan(`steps.${key}.navLabel`),
  );
  const stepTitles = FIRST_WEEK_STEP_KEYS.map((key: FirstWeekStepKey) =>
    plan(`steps.${key}.title`),
  );
  const stepLinks = FIRST_WEEK_STEP_KEYS.map(
    (key: FirstWeekStepKey) => FIRST_WEEK_STEP_LINKS[key].primary,
  );

  const startHerePanel = (
    <StartHerePanel
      title={t("startHereTitle")}
      intro={t("startHereIntro")}
      roadmapLabel={t("startHereRoadmap")}
      stepLabels={stepLabels}
      stepTitles={stepTitles}
      stepLinks={stepLinks}
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
        <h1 className="text-2xl font-bold tracking-tight text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-3xl text-gray-600">{t("subtitle")}</p>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
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
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-opseu-dark marker:content-none [&::-webkit-details-marker]:hidden">
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
          <StartHerePanel
            title={t("startHereTitle")}
            intro={t("startHereIntro")}
            roadmapLabel={t("startHereRoadmap")}
            stepLabels={stepLabels}
            stepTitles={stepTitles}
            stepLinks={stepLinks}
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
        className="mt-10 hidden rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.06] via-white to-opseu-blue/[0.04] p-5 xl:block"
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
          <nav
            className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1"
            aria-label={t("channelGuidesTitle")}
          >
            {channelGuides.map((link, i) => (
              <span
                key={link.href}
                className="inline-flex items-baseline gap-x-3"
              >
                {i > 0 ? (
                  <span className="text-gray-300" aria-hidden>
                    ·
                  </span>
                ) : null}
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-opseu-blue underline-offset-2 hover:underline"
                >
                  {nav(link.key)}
                </Link>
              </span>
            ))}
          </nav>
        </section>
      ) : null}
    </ComposedPageLayout>
  );
}
