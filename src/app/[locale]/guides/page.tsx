import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";
import { TOOL_COMPOSITION } from "@/lib/constants/page-composition";
import type { NavLinkKey } from "@/components/layout/nav/nav-config";
import {
  GUIDE_CATALOG_GROUP_IDS,
  GUIDE_CATALOG_PATH,
  GUIDE_REGISTRY,
  type GuideGroupId,
} from "@/lib/comms/guide-registry";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata(GUIDE_CATALOG_PATH, params);
}

const START_HERE = [
  {
    href: "/guide/social-media-plan",
    titleKey: "firstWeek" as const,
    stepKey: "firstWeek" as const,
  },
  {
    href: "/guide/steward-playbooks",
    titleKey: "stewardPlaybooksHub" as const,
    stepKey: "playbooks" as const,
  },
  {
    href: "/guide/officer-learning",
    titleKey: "officerLearningTopNav" as const,
    stepKey: "officerLearning" as const,
  },
] as const;

function StartHerePanel({
  title,
  intro,
  roadmapLabel,
  steps,
  bare = false,
}: {
  title: string;
  intro: string;
  roadmapLabel: string;
  steps: { href: string; label: string; title: string }[];
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
        {steps.map((step, index) => (
          <li key={step.href}>
            <Link
              href={step.href}
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
                  {step.label}
                </span>
                <span className="mt-0.5 block text-xs text-gray-600">
                  {step.title}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-4 border-t border-opseu-blue/10 pt-4">
        <Link
          href="/guide/steward-playbooks"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-opseu-blue underline-offset-2 hover:underline"
        >
          {roadmapLabel} →
        </Link>
      </p>
    </div>
  );
}

export default async function GuidesCatalogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guidesIndex");
  const nav = await getTranslations("nav");

  const steps = START_HERE.map((row) => ({
    href: row.href,
    label: nav(row.titleKey),
    title: t(`startHereSteps.${row.stepKey}`),
  }));

  const startHerePanel = (
    <StartHerePanel
      title={t("startHereTitle")}
      intro={t("startHereIntro")}
      roadmapLabel={t("startHereRoadmap")}
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
            steps={steps}
            bare
          />
        </div>
      </details>

      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:mt-10 lg:grid-cols-2 xl:grid-cols-4 xl:gap-8">
        {GUIDE_CATALOG_GROUP_IDS.map((groupId: GuideGroupId) => (
          <section
            key={groupId}
            aria-labelledby={`guides-${groupId}`}
          >
            <h2
              id={`guides-${groupId}`}
              className="text-sm font-semibold uppercase tracking-wide text-gray-500"
            >
              {t(`groups.${groupId}.title`)}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {t(`groups.${groupId}.intro`)}
            </p>
            <ul className="mt-3 space-y-3">
              {GUIDE_REGISTRY[groupId].map((entry) => (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    className="group block rounded-lg border border-transparent px-1 py-1 transition-colors hover:border-opseu-blue/15 hover:bg-opseu-blue/5"
                  >
                    <span className="inline-flex min-h-11 items-center font-medium text-opseu-blue underline-offset-2 group-hover:underline">
                      {nav((entry.navKey ?? "guide") as NavLinkKey)}
                    </span>
                    <span className="mt-0.5 block text-sm text-gray-600">
                      {t(`blurbs.${entry.key}`)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ComposedPageLayout>
  );
}
