"use client";

import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { PageShell } from "@/components/layout/PageShell";
import { ShareThisTool } from "@/components/share/ShareThisTool";
import { UnionOpsMark } from "@/components/brand/UnionOpsMark";
import { WorkshopDemoPath } from "@/components/comms/WorkshopDemoPath";
import { markWorkshopDemoSession } from "@/lib/comms/workshop-demo-session";
import { HomeHeroPreview } from "@/components/pages/HomeHeroPreview";
import { useBrandStore } from "@/store/brand-store";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { softGradientEndColor } from "@/lib/utils/canvas-surface";
import { blendHex } from "@/lib/utils/contrast";
import {
  inkWithAlpha,
  isLightInk,
  pickContrastingInk,
} from "@/lib/utils/ink";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";

type ChannelId = "boards" | "print" | "social" | "website";

/** Cap tiles so channels share equal visual weight (guides stay in Learn). */
const channelItems: Record<
  ChannelId,
  { href: string; titleKey: string }[]
> = {
  boards: [
    { href: "/tools/board-banner", titleKey: "boardBanner" },
    { href: "/tools/board-notice", titleKey: "boardNotice" },
    { href: "/tools/solidarity-poster", titleKey: "solidarityPoster" },
    { href: "/guide/union-boards", titleKey: "unionBoardsGuide" },
  ],
  print: [
    { href: "/tools/flyer-maker", titleKey: "flyerMaker" },
    { href: "/guide/print", titleKey: "printGuide" },
  ],
  social: [
    { href: "/tools/graphic-maker", titleKey: "graphicMaker" },
    { href: "/tools/meeting-background", titleKey: "meetingBackground" },
    { href: "/examples", titleKey: "socialExamples" },
    { href: "/captions", titleKey: "captions" },
  ],
  website: [
    { href: "/tools/website-template", titleKey: "websiteTemplate" },
    { href: "/guide/website", titleKey: "websiteGuide" },
    { href: "/guide/email-broadcast", titleKey: "emailBroadcastGuide" },
  ],
};

/** Matches first-week roadmap emphasis: boards → print → social → website */
const channelOrder: ChannelId[] = ["boards", "print", "social", "website"];

function HomePathCard({
  title,
  description,
  hint,
  action,
  testId,
  emphasized = false,
}: {
  title: string;
  description: string;
  hint?: string;
  action: ReactNode;
  testId: string;
  emphasized?: boolean;
}) {
  return (
    <li
      data-testid={testId}
      className={cn(
        "flex min-w-0 flex-col gap-4 border-l-2 pl-5",
        emphasized ? "border-opseu-blue" : "border-opseu-blue/30",
      )}
    >
      <div className="min-w-0">
        <h3 className="text-[clamp(1.125rem,1.05rem+0.35vw,1.25rem)] font-bold text-opseu-dark">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {description}
        </p>
        {hint ? (
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{hint}</p>
        ) : null}
      </div>
      <div className="mt-auto">{action}</div>
    </li>
  );
}

export function HomeContent() {
  const t = useTranslations("home");
  const nav = useTranslations("nav");
  const tools = useTranslations("tools");
  const hubPublic = isOfficerHubPublic();
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const commsHref = themeEstablished
    ? "/guide/social-media-plan"
    : "/onboarding";

  const primary = brandKit.primaryColor;
  const secondary = brandKit.secondaryColor;
  const accent = brandKit.accentColor;
  const heroMid = blendHex(accent, primary, 0.35);
  const heroEnd = softGradientEndColor(primary, secondary);
  const ink = pickContrastingInk(primary);
  const inkMuted = inkWithAlpha(ink, isLightInk(ink) ? 0.92 : 0.88);
  const inkSoft = inkWithAlpha(ink, isLightInk(ink) ? 0.84 : 0.78);
  const lightInk = isLightInk(ink);

  useEffect(() => {
    if (window.location.hash !== "#toolkit") return;
    document.getElementById("toolkit")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <>
      <section
        className="home-hero relative w-full overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, ${primary} 0%, ${heroMid} 52%, ${heroEnd} 100%)`,
        }}
        aria-labelledby="home-hero-heading"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(ellipse 80% 60% at 72% 38%, ${inkWithAlpha(ink, 0.14)}, transparent 55%)`,
          }}
          aria-hidden
        />
        <div
          className={cn(
            PAGE_SHELL.wide,
            "relative grid min-h-[min(72vh,40rem)] grid-cols-1 items-center gap-10 py-14 md:min-h-[min(68vh,36rem)] md:gap-12 md:py-16 lg:grid-cols-2 lg:gap-14 xl:gap-16",
          )}
        >
          <div className="home-enter flex min-w-0 flex-col items-start gap-6 sm:gap-8">
            <div
              data-testid="home-hero-brand"
              className="shrink-0 rounded-[28%] bg-white/95 p-3 shadow-lg ring-1 ring-black/5"
            >
              <UnionOpsMark
                size="xl"
                primaryColor={primary}
                secondaryColor={secondary}
                title="UnionOps"
              />
            </div>
            <div className="home-enter home-enter-delay-1 min-w-0 max-w-xl text-left">
              <p
                className="text-sm font-semibold uppercase tracking-[0.2em]"
                style={{ color: inkSoft }}
              >
                UnionOps
              </p>
              <h1
                id="home-hero-heading"
                className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl md:leading-tight"
                style={{ color: ink }}
              >
                {t("headline")}
              </h1>
              <p
                className="mt-3 text-xl font-semibold tracking-wide md:text-2xl"
                style={{ color: inkMuted }}
              >
                {t("slogan")}
              </p>
              <p
                className="mt-4 text-base sm:text-lg"
                style={{ color: inkSoft }}
              >
                {t(hubPublic ? "subtitle" : "subtitleCommsOnly")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#toolkit"
                  className={cn(
                    "inline-flex min-h-11 items-center justify-center rounded-lg px-6 py-3 text-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
                    lightInk
                      ? "bg-white text-opseu-dark hover:bg-white/90"
                      : "bg-opseu-dark text-white hover:bg-opseu-dark/90",
                  )}
                >
                  {t("heroCta")}
                </a>
              </div>
            </div>
          </div>

          <HomeHeroPreview className="justify-self-stretch lg:justify-self-end" />
        </div>
      </section>

      <PageShell className="py-8 md:py-12">
        <section className="home-enter home-enter-delay-1 mb-10">
          <Callout tone="plain" className="bg-opseu-blue/5" role="note">
            {t(hubPublic ? "trustBanner" : "trustBannerCommsOnly")}{" "}
            <Link
              href="/manifesto"
              className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
            >
              {t("trustManifestoLink")}
            </Link>
          </Callout>
        </section>

        <section
          id="toolkit"
          className="home-enter home-enter-delay-2 mb-12 scroll-mt-28"
          aria-labelledby="home-jobs-heading"
        >
          <h2
            id="home-jobs-heading"
            className="text-[clamp(1.5rem,1.25rem+1vw,1.875rem)] font-bold tracking-tight text-opseu-dark"
          >
            {t("jobsTitle")}
          </h2>
          <p className="mt-2 max-w-prose text-base leading-relaxed text-gray-600">
            {t("jobsIntro")}
          </p>
          <ul className="mt-8 grid list-none gap-8 p-0 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
            <HomePathCard
              testId="home-path-comms"
              emphasized
              title={t("pathCommsTitle")}
              description={t("pathCommsDesc")}
              hint={t("pathCommsHint")}
              action={
                <Link href={commsHref} onClick={markWorkshopDemoSession}>
                  <Button size="md" className="min-h-11">
                    {themeEstablished
                      ? t("openFirstWeekCta")
                      : t("brandSetupCta")}
                  </Button>
                </Link>
              }
            />
            <HomePathCard
              testId="home-path-steward"
              title={t("pathStewardTitle")}
              description={t("pathStewardDesc")}
              action={
                <Link href="/guide/steward-playbooks">
                  <Button size="md" variant="outline" className="min-h-11">
                    {t("pathStewardCta")}
                  </Button>
                </Link>
              }
            />
            <HomePathCard
              testId="home-path-officer"
              title={t("pathOfficerTitle")}
              description={t(
                hubPublic ? "pathOfficerDesc" : "pathOfficerLearningDesc",
              )}
              action={
                <div className="flex flex-wrap items-center gap-3">
                  {hubPublic ? (
                    <Link href="/app">
                      <Button size="md" className="min-h-11">
                        {t("pathOfficerCta")}
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/guide/officer-learning">
                        <Button size="md" variant="outline" className="min-h-11">
                          {t("pathOfficerLearningCta")}
                        </Button>
                      </Link>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                        {t("pathOfficerCtaComingSoon")}
                      </p>
                    </>
                  )}
                </div>
              }
            />
          </ul>
        </section>

        <section
          className="home-enter home-enter-delay-2 mb-12 rounded-2xl border-2 border-opseu-blue/40 bg-opseu-blue/5 p-5 sm:p-6"
          aria-label={t("workshopBandLabel")}
        >
          <div className="rounded-xl border border-opseu-blue/20 bg-white p-4 sm:p-5">
            <WorkshopDemoPath />
          </div>
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-gray-700">
            {t(hubPublic ? "privacyNote" : "privacyNoteCommsOnly")}
          </p>
          <div className="mt-4">
            <ShareThisTool />
          </div>
        </section>

        <section
          className="home-enter home-enter-delay-3"
          aria-labelledby="home-channels-heading"
        >
          <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="home-channels-heading"
                className="text-[clamp(1.5rem,1.25rem+1vw,1.875rem)] font-bold tracking-tight text-opseu-dark"
              >
                {t("channelsTitle")}
              </h2>
              <p className="mt-2 max-w-prose text-base leading-relaxed text-gray-600">
                {t("channelsIntro")}
              </p>
            </div>
            <nav
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
              aria-label={nav("brandKit")}
            >
              <Link
                href="/brand-kit"
                className="font-semibold text-opseu-dark underline underline-offset-2 hover:text-opseu-blue"
              >
                {nav("brandKit")}
              </Link>
              <span className="text-gray-300" aria-hidden="true">
                ·
              </span>
              <Link
                href="/tools/logo-builder"
                className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
              >
                {nav("logoBuilder")}
              </Link>
            </nav>
          </div>

          <ul className="mt-8 grid list-none gap-8 p-0 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
            {channelOrder.map((channel) => (
              <li
                key={channel}
                className="min-w-0 border-l-2 border-opseu-blue/30 pl-5"
              >
                <h3 className="text-[clamp(1.125rem,1.05rem+0.35vw,1.25rem)] font-bold text-opseu-dark">
                  {t(`channels.${channel}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {t(`channels.${channel}.description`)}
                </p>
                <ul className="mt-3 space-y-1">
                  {channelItems[channel].map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="group block rounded-lg border border-transparent px-1 py-1 transition-colors hover:border-opseu-blue/15 hover:bg-opseu-blue/5"
                      >
                        <span className="inline-flex min-h-10 items-center text-sm font-medium text-opseu-blue underline-offset-2 group-hover:underline">
                          {nav(item.titleKey)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="mt-12 rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.06] via-white to-opseu-blue/[0.04] p-5 sm:p-6"
          aria-labelledby="home-labour-playbooks"
        >
          <h2
            id="home-labour-playbooks"
            className="text-sm font-semibold uppercase tracking-wide text-gray-500"
          >
            {tools("labourPlaybooksTitle")}
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600">
            {tools("labourPlaybooksIntro")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/guide/steward-playbooks"
              className="inline-flex min-h-11 items-center font-semibold text-opseu-blue underline-offset-2 hover:underline"
            >
              {tools("labourPlaybooksCta")} →
            </Link>
            <Link
              href="/guide/social-media-plan"
              className="inline-flex min-h-11 items-center font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
            >
              {nav("firstWeek")}
            </Link>
          </div>
        </section>
      </PageShell>
    </>
  );
}
