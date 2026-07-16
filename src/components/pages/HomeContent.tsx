"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { PageShell } from "@/components/layout/PageShell";
import { ShareThisTool } from "@/components/share/ShareThisTool";
import { UnionOpsMark } from "@/components/brand/UnionOpsMark";
import { useBrandStore } from "@/store/brand-store";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { inkWithAlpha, isLightInk, pickContrastingInk } from "@/lib/utils/ink";
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
  ],
};

/** Matches Get started roadmap emphasis: boards → print → social → website */
const channelOrder: ChannelId[] = ["boards", "print", "social", "website"];

export function HomeContent() {
  const t = useTranslations("home");
  const nav = useTranslations("nav");
  const common = useTranslations("common");
  const hubPublic = isOfficerHubPublic();
  const brandKit = useBrandStore((s) => s.brandKit);

  const primary = brandKit.primaryColor;
  const secondary = brandKit.secondaryColor;
  const accent = brandKit.accentColor;
  const ink = pickContrastingInk(primary);
  const inkMuted = inkWithAlpha(ink, 0.82);
  const inkSoft = inkWithAlpha(ink, 0.7);
  const lightInk = isLightInk(ink);

  return (
    <>
      <section
        className="home-hero relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, ${accent} 0%, ${primary} 48%, ${secondary} 100%)`,
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
        <div className="relative mx-auto flex min-h-[min(72vh,40rem)] w-full max-w-5xl flex-col justify-center px-4 py-14 sm:px-6 md:min-h-[min(68vh,36rem)] md:py-16">
          <div className="home-enter flex flex-col items-start gap-8 md:flex-row md:items-center md:gap-12 lg:gap-16">
            <div
              data-testid="home-hero-brand"
              className="home-enter shrink-0 rounded-[28%] bg-white/95 p-3 shadow-lg ring-1 ring-black/5"
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
                <Link href="/guide/social-media-plan">
                  <Button
                    size="lg"
                    className={cn(
                      "min-h-11",
                      lightInk
                        ? "bg-white text-opseu-dark hover:bg-white/90"
                        : "bg-opseu-dark text-white hover:bg-opseu-dark/90",
                    )}
                  >
                    {t("pathCommsCta")}
                  </Button>
                </Link>
                <Link href="/onboarding">
                  <Button
                    variant="outline"
                    size="lg"
                    className="min-h-11 border-2 bg-transparent hover:bg-black/5"
                    style={{
                      borderColor: ink,
                      color: ink,
                    }}
                  >
                    {t("heroCta")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PageShell className="py-8 md:py-12">
        <section className="home-enter home-enter-delay-1 mb-12 space-y-4">
          <Callout tone="plain" className="bg-opseu-blue/5" role="note">
            {t(hubPublic ? "trustBanner" : "trustBannerCommsOnly")}{" "}
            <Link
              href="/manifesto"
              className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
            >
              {t("trustManifestoLink")}
            </Link>
          </Callout>
          <p className="text-sm text-gray-600">
            {t(hubPublic ? "privacyNote" : "privacyNoteCommsOnly")}
          </p>
          <ShareThisTool />
        </section>

        {hubPublic ? (
          <section className="home-enter home-enter-delay-2 mb-12 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-opseu-blue/20 bg-opseu-blue/5 p-5 text-left">
              <h2 className="text-lg font-bold text-opseu-dark">
                {t("pathCommsTitle")}
              </h2>
              <p className="mt-2 text-sm text-gray-600">{t("pathCommsDesc")}</p>
              <p className="mt-2 text-sm text-gray-600">{t("pathCommsHint")}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-left">
              <h2 className="text-lg font-bold text-opseu-dark">
                {t("pathOfficerTitle")}
              </h2>
              <p className="mt-2 text-sm text-gray-600">{t("pathOfficerDesc")}</p>
              <div className="mt-4">
                <Link href="/app">
                  <Button size="md">{t("pathOfficerCta")}</Button>
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <section className="home-enter home-enter-delay-2 mb-12">
            <Callout
              tone="muted"
              className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <div>
                <p className="font-semibold text-opseu-dark">
                  {t("pathOfficerTitleComingSoon")}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {t("pathOfficerDescComingSoon")}
                </p>
              </div>
              <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-700">
                {t("pathOfficerCtaComingSoon")}
              </p>
            </Callout>
          </section>
        )}

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
              <span className="text-gray-300" aria-hidden="true">
                ·
              </span>
              <Link
                href="/assets"
                className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
              >
                {nav("assets")}
              </Link>
            </nav>
          </div>

          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            {channelOrder.map((channel) => (
              <div key={channel} className="text-left">
                <h3 className="text-lg font-semibold text-opseu-dark">
                  {t(`channels.${channel}.title`)}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {t(`channels.${channel}.description`)}
                </p>
                <ul className="mt-3 space-y-1.5 border-l-2 border-opseu-blue/25 pl-3">
                  {channelItems[channel].map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm font-medium text-opseu-dark underline-offset-2 hover:text-opseu-blue hover:underline"
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
            href="/guide/resources"
            className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {nav("resources")}
          </Link>
          <span className="text-gray-300" aria-hidden="true">
            ·
          </span>
          <Link
            href="/guide"
            className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {common("learnMore")}
          </Link>
        </section>
      </PageShell>
    </>
  );
}
