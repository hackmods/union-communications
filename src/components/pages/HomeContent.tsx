"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
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

function CommsPathCard({
  className,
}: {
  className?: string;
}) {
  const t = useTranslations("home");

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-opseu-blue/20 bg-opseu-blue/5 p-6 text-left",
        className,
      )}
    >
      <h2 className="text-xl font-bold text-opseu-dark">{t("pathCommsTitle")}</h2>
      <p className="mt-3 flex-1 text-base text-gray-600">{t("pathCommsDesc")}</p>
      <p className="mt-3 text-sm text-gray-600">{t("pathCommsHint")}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/guide/social-media-plan">
          <Button size="lg">{t("pathCommsCta")}</Button>
        </Link>
        <Link href="/onboarding">
          <Button variant="outline" size="lg">
            {t("heroCta")}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function HomeContent() {
  const t = useTranslations("home");
  const nav = useTranslations("nav");
  const common = useTranslations("common");
  const hubPublic = isOfficerHubPublic();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <section
        className={cn(
          "home-enter relative mb-10 overflow-hidden rounded-2xl border border-opseu-blue/15",
          "bg-gradient-to-br from-opseu-blue/[0.07] via-white to-opseu-dark/[0.04]",
          "px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12",
        )}
      >
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] lg:gap-12">
          <div className="text-left">
            <h1 className="text-4xl font-bold tracking-tight text-opseu-dark md:text-5xl lg:text-[3.25rem] lg:leading-tight">
              {t("title")}
            </h1>
            <p className="mt-3 text-2xl font-semibold tracking-wide text-opseu-blue md:text-3xl">
              {t("slogan")}
            </p>
            <p className="mt-4 max-w-xl text-lg text-gray-600">
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
            <p className="mt-4 text-sm text-opseu-blue">
              {t(hubPublic ? "privacyNote" : "privacyNoteCommsOnly")}
            </p>
            <div className="mt-4">
              <ShareThisTool />
            </div>
          </div>

          <aside
            className="rounded-xl border border-opseu-blue/20 bg-white/80 px-5 py-4 text-left text-sm text-opseu-dark shadow-sm backdrop-blur-sm md:text-base lg:self-stretch lg:flex lg:flex-col lg:justify-center"
            role="note"
          >
            <p>
              <span className="mr-1" aria-hidden="true">
                🔒
              </span>
              {t(hubPublic ? "trustBanner" : "trustBannerCommsOnly")}{" "}
              <Link
                href="/manifesto"
                className="font-medium underline underline-offset-2 hover:text-opseu-blue"
              >
                {t("trustManifestoLink")}
              </Link>
            </p>
          </aside>
        </div>
      </section>

      {hubPublic ? (
        <section className="home-enter home-enter-delay-1 mb-14 grid gap-6 md:grid-cols-2">
          <CommsPathCard />
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 text-left">
            <h2 className="text-xl font-bold text-opseu-dark">
              {t("pathOfficerTitle")}
            </h2>
            <p className="mt-3 flex-1 text-base text-gray-600">
              {t("pathOfficerDesc")}
            </p>
            <div className="mt-6">
              <Link href="/app">
                <Button size="lg">{t("pathOfficerCta")}</Button>
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="home-enter home-enter-delay-1 mb-14 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
          <CommsPathCard />
          <aside className="flex flex-col justify-center rounded-xl border border-dashed border-gray-300 bg-white px-5 py-5 text-left lg:py-6">
            <h2 className="text-base font-bold text-opseu-dark">
              {t("pathOfficerTitleComingSoon")}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {t("pathOfficerDescComingSoon")}
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("pathOfficerCtaComingSoon")}
            </p>
          </aside>
        </section>
      )}

      <section className="home-enter home-enter-delay-2">
        <div className="grid gap-8 lg:grid-cols-[minmax(14rem,17.5rem)_minmax(0,1fr)] lg:items-start xl:gap-10">
          <aside className="rounded-xl border border-opseu-blue/20 bg-opseu-blue/5 p-5 lg:sticky lg:top-24">
            <h2 className="text-lg font-bold text-opseu-dark">
              {nav("brandKit")}
            </h2>
            <p className="mt-2 text-sm text-gray-600">{t("brandRailDesc")}</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/brand-kit">
                <Button className="w-full" size="lg">
                  {nav("brandKit")}
                </Button>
              </Link>
              <Link
                href="/tools/logo-builder"
                className="text-center text-sm font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
              >
                {nav("logoBuilder")}
              </Link>
              <Link
                href="/assets"
                className="text-center text-sm font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
              >
                {nav("assets")}
              </Link>
            </div>
          </aside>

          <div>
            <h2 className="mb-2 text-2xl font-bold text-opseu-dark">
              {t("channelsTitle")}
            </h2>
            <p className="mb-6 max-w-2xl text-base text-gray-600">
              {t("channelsIntro")}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {channelOrder.map((channel) => (
                <div
                  key={channel}
                  className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-opseu-dark">
                    {t(`channels.${channel}.title`)}
                  </h3>
                  <p className="mt-2 flex-1 text-sm text-gray-600">
                    {t(`channels.${channel}.description`)}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {channelItems[channel].map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="block rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-medium text-opseu-dark transition-colors hover:border-opseu-blue/30 hover:bg-opseu-blue/5"
                        >
                          {nav(item.titleKey)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="home-enter home-enter-delay-3 mt-12 flex flex-wrap items-center justify-center gap-3">
        <Link href="/guide/social-media-plan">
          <Button size="lg">{t("pathCommsCta")}</Button>
        </Link>
        <Link href="/guide/resources">
          <Button variant="outline" size="lg">
            {nav("resources")}
          </Button>
        </Link>
        <Link href="/guide">
          <Button variant="ghost" size="lg">
            {common("learnMore")}
          </Button>
        </Link>
      </section>
    </div>
  );
}
