"use client";

import { useEffect } from "react";
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

export function HomeContent() {
  const t = useTranslations("home");
  const nav = useTranslations("nav");
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
  // Primary-led band — gold-first + paper end bleach white type (long-standing).
  const heroMid = blendHex(accent, primary, 0.35);
  const heroEnd = softGradientEndColor(primary, secondary);
  // One ink family for the whole hero copy. Mixing pickFieldInk (black) with
  // mutedInkOnBackground(primary) (white on coral) looked accidental.
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
        <div className="relative mx-auto grid min-h-[min(72vh,40rem)] w-full max-w-[90rem] grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 md:min-h-[min(68vh,36rem)] md:gap-12 md:py-16 lg:grid-cols-2 lg:gap-14 xl:gap-16 xl:px-8">
          <div className="home-enter flex min-w-0 flex-col items-start gap-6 sm:gap-8">
            <div
              data-testid="home-hero-brand"
              className="shrink-0 rounded-[28%] bg-white/95 p-3 shadow-lg ring-1 ring-black/5"
            >
              {/* Live interlocking mark — plate/glyph follow Brand Kit primary + secondary */}
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
            className="text-2xl font-bold text-opseu-dark"
          >
            {t("jobsTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-base text-gray-600">
            {t("jobsIntro")}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Callout
              tone="brand"
              data-testid="home-path-comms"
              className="flex flex-col gap-3 p-5"
            >
              <div>
                <h3 className="text-lg font-bold text-opseu-dark">
                  {t("pathCommsTitle")}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{t("pathCommsDesc")}</p>
                <p className="mt-2 text-sm text-gray-600">{t("pathCommsHint")}</p>
              </div>
              <div>
                <Link href={commsHref} onClick={markWorkshopDemoSession}>
                  <Button size="md" className="min-h-11">
                    {themeEstablished
                      ? t("openFirstWeekCta")
                      : t("brandSetupCta")}
                  </Button>
                </Link>
              </div>
            </Callout>

            <Callout
              tone="plain"
              data-testid="home-path-steward"
              className="flex flex-col gap-3 p-5"
            >
              <div>
                <h3 className="text-lg font-bold text-opseu-dark">
                  {t("pathStewardTitle")}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{t("pathStewardDesc")}</p>
              </div>
              <div>
                <Link href="/guide/steward-playbooks">
                  <Button size="md" variant="outline" className="min-h-11">
                    {t("pathStewardCta")}
                  </Button>
                </Link>
              </div>
            </Callout>
            <Callout
              tone="plain"
              data-testid="home-path-officer"
              className="flex flex-col gap-3 p-5 md:col-span-2 lg:col-span-1"
            >
              <div>
                <h3 className="text-lg font-bold text-opseu-dark">
                  {t("pathOfficerTitle")}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {t(
                    hubPublic
                      ? "pathOfficerDesc"
                      : "pathOfficerLearningDesc",
                  )}
                </p>
              </div>
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
            </Callout>
          </div>
        </section>

        <section className="home-enter home-enter-delay-2 mb-12 space-y-4">
          <WorkshopDemoPath className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5" />
          <p className="text-sm text-gray-600">
            {t(hubPublic ? "privacyNote" : "privacyNoteCommsOnly")}
          </p>
          <ShareThisTool />
        </section>

        <section className="home-enter home-enter-delay-3">
          <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-opseu-dark">
                {t("channelsTitle")}
              </h2>
              <p className="mt-2 max-w-2xl text-base text-gray-600">
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

          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5 2xl:gap-7">
            {channelOrder.map((channel) => (
              <div
                key={channel}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <h3 className="text-lg font-semibold text-opseu-dark">
                  {t(`channels.${channel}.title`)}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {t(`channels.${channel}.description`)}
                </p>
                <ul className="mt-3 space-y-1">
                  {channelItems[channel].map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="inline-flex min-h-10 items-center text-sm font-medium text-opseu-blue underline-offset-2 hover:underline"
                      >
                        {nav(item.titleKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          <Link
            href="/guide/social-media-plan"
            className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {nav("firstWeek")}
          </Link>
          <span className="text-gray-300" aria-hidden="true">
            ·
          </span>
          <Link
            href="/guide/steward-playbooks"
            className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {nav("stewardPlaybooksHub")}
          </Link>
        </section>
      </PageShell>
    </>
  );
}
