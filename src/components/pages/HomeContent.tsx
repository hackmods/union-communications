"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { PageShell } from "@/components/layout/PageShell";
import { ShareThisTool } from "@/components/share/ShareThisTool";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { cn } from "@/lib/utils";

type ChannelId = "boards" | "print" | "social" | "website";

/** Cap tiles so channels share equal visual weight (guides stay in Learn). */
const channelItems: Record<
  ChannelId,
  { href: string; titleKey: string }[]
> = {
  boards: [
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
    { href: "/examples", titleKey: "socialExamples" },
    { href: "/captions", titleKey: "captions" },
    { href: "/guide", titleKey: "guide" },
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

  return (
    <PageShell className="py-8 md:py-12">
      <section
        className={cn(
          "home-enter relative mb-12 overflow-hidden rounded-2xl border border-opseu-blue/15",
          "bg-gradient-to-br from-opseu-blue/[0.07] via-white to-opseu-dark/[0.04]",
          "px-5 py-8 md:px-8 md:py-10",
        )}
      >
        <div className="max-w-2xl text-left">
          <h1 className="text-4xl font-bold tracking-tight text-opseu-dark md:text-5xl md:leading-tight">
            {t("title")}
          </h1>
          <p className="mt-3 text-2xl font-semibold tracking-wide text-opseu-blue md:text-3xl">
            {t("slogan")}
          </p>
          <p className="mt-4 text-lg text-gray-600">
            {t(hubPublic ? "subtitle" : "subtitleCommsOnly")}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/guide/social-media-plan">
              <Button size="lg">{t("pathCommsCta")}</Button>
            </Link>
            <Link href="/onboarding">
              <Button variant="outline" size="lg">
                {t("heroCta")}
              </Button>
            </Link>
          </div>
          <Callout tone="plain" className="mt-6 bg-white/70" role="note">
            {t(hubPublic ? "trustBanner" : "trustBannerCommsOnly")}{" "}
            <Link
              href="/manifesto"
              className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
            >
              {t("trustManifestoLink")}
            </Link>
          </Callout>
          <p className="mt-3 text-sm text-gray-600">
            {t(hubPublic ? "privacyNote" : "privacyNoteCommsOnly")}
          </p>
          <div className="mt-4">
            <ShareThisTool />
          </div>
        </div>
      </section>

      {hubPublic ? (
        <section className="home-enter home-enter-delay-1 mb-12 grid gap-4 md:grid-cols-2">
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
        <section className="home-enter home-enter-delay-1 mb-12">
          <Callout tone="muted" className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
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

      <section className="home-enter home-enter-delay-2">
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

      <section className="home-enter home-enter-delay-3 mt-12 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
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
  );
}
