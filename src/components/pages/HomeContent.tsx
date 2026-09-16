"use client";

import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { IconChip } from "@/components/ui/IconChip";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
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

/* -------------------------------------------------------------------------- */
/*  Visual primitives                                                         */
/* -------------------------------------------------------------------------- */

type IconName =
  | "megaphone"
  | "shield"
  | "gear"
  | "board"
  | "print"
  | "share"
  | "globe"
  | "spark";

function Icon({ name, className }: { name: IconName; className?: string }) {
  const common = cn(
    "h-5 w-5 shrink-0",
    className,
  );
  switch (name) {
    case "megaphone":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={common}
        >
          <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" />
          <path d="M14 8a4 4 0 0 1 0 8" />
          <path d="M17 5a8 8 0 0 1 0 14" />
        </svg>
      );
    case "shield":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={common}
        >
          <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "gear":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={common}
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );
    case "board":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={common}
        >
          <rect x="4" y="4" width="16" height="18" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      );
    case "print":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={common}
        >
          <path d="M6 9V3h12v6" />
          <rect x="4" y="9" width="16" height="8" rx="2" />
          <path d="M8 17h8v4H8z" />
        </svg>
      );
    case "share":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={common}
        >
          <rect x="6" y="3" width="12" height="18" rx="2" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "globe":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={common}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      );
    case "spark":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={common}
        >
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
  }
}

/**
 * Interactive home surface = the elevated Card variant. Local override only
 * adds the emphasized hairline gradient for the Comms card.
 */
function HomePathCard({
  title,
  description,
  hint,
  action,
  testId,
  icon,
  eyebrow,
  emphasized = false,
}: {
  title: string;
  description: string;
  hint?: string;
  action: ReactNode;
  testId: string;
  icon: IconName;
  eyebrow: string;
  emphasized?: boolean;
}) {
  return (
    <li
      data-testid={testId}
      className="min-w-0 list-none"
    >
      <Card
        variant="elevated"
        interactive
        className={cn(
          "relative flex h-full min-w-0 flex-col gap-4 sm:p-6",
          emphasized &&
            "ring-1 ring-opseu-blue/30 bg-gradient-to-br from-white via-white to-opseu-blue/[0.04]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <IconChip tone={emphasized ? "brand" : "amber"}>
            <Icon name={icon} />
          </IconChip>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider",
              emphasized ? "bg-opseu-blue/10 text-opseu-blue" : "bg-slate-100 text-slate-700",
            )}
          >
            {eyebrow}
          </span>
        </div>

        <div className="min-w-0">
          <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-[1.375rem]">
            {title}
          </h3>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-600">
            {description}
          </p>
          {hint ? (
            <p className="mt-3 rounded-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-[0.85rem] leading-relaxed text-amber-900">
              {hint}
            </p>
          ) : null}
        </div>

        <div className="mt-auto pt-2">{action}</div>
      </Card>
    </li>
  );
}

function ChannelTile({
  id,
  icon,
  title,
  description,
  itemLinks,
  itemLabel,
}: {
  id: ChannelId;
  icon: IconName;
  title: string;
  description: string;
  itemLinks: { href: string; titleKey: string }[];
  itemLabel: (key: string) => string;
}) {
  return (
    <li className="min-w-0 list-none">
      <Card
        variant="elevated"
        interactive
        data-testid={`home-channel-${id}`}
        className="flex h-full min-w-0 flex-col gap-4 sm:p-6"
      >
        <div className="flex items-center gap-3">
          <IconChip tone="brand">
            <Icon name={icon} />
          </IconChip>
          <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {title}
          </h3>
        </div>
        <p className="text-[0.9rem] leading-relaxed text-slate-600">
          {description}
        </p>
        <ul className="mt-1 flex flex-col gap-1.5 border-t border-slate-100 pt-4">
          {itemLinks.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-10 items-center justify-between gap-2 rounded-md px-2 py-1.5",
                  "text-[0.9rem] font-medium text-opseu-blue",
                  "transition-colors duration-150 ease-out",
                  "hover:bg-opseu-blue/5 hover:text-opseu-dark hover:underline hover:underline-offset-2",
                )}
              >
                <span className="truncate">{itemLabel(item.titleKey)}</span>
                <span aria-hidden className="text-xs opacity-60">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export function HomeContent() {
  const t = useTranslations("home");
  const nav = useTranslations("nav");
  const toolsIndex = useTranslations("toolsIndex");
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
      {/* ---------- Hero ---------- */}
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
                className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-[3.25rem] md:leading-[1.05]"
                style={{ color: ink }}
              >
                {t("headline")}
              </h1>
              <p
                className="mt-3 text-2xl font-semibold tracking-wide md:text-3xl"
                style={{ color: inkMuted }}
              >
                {t("slogan")}
              </p>
              <p
                className="mt-4 max-w-lg text-base sm:text-lg"
                style={{ color: inkSoft }}
              >
                {t(hubPublic ? "subtitle" : "subtitleCommsOnly")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#toolkit"
                  className={cn(
                    "inline-flex min-h-11 items-center justify-center rounded-lg px-6 py-3 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40 sm:text-lg",
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

      <PageShell className="py-10 md:py-14">
        {/* ---------- Trust banner ---------- */}
        <section className="home-enter home-enter-delay-1 mb-12">
          <Callout
            tone="plain"
            className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm sm:p-6"
            role="note"
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800"
                aria-hidden
              >
                <Icon name="shield" className="h-5 w-5" />
              </span>
              <p className="min-w-0 text-[0.95rem] leading-relaxed text-amber-950">
                {t(hubPublic ? "trustBanner" : "trustBannerCommsOnly")}{" "}
                <Link
                  href="/manifesto"
                  className="font-semibold text-amber-900 underline underline-offset-2 hover:text-opseu-dark"
                >
                  {t("trustManifestoLink")} →
                </Link>
              </p>
            </div>
          </Callout>
        </section>

        {/* ---------- Where to start ---------- */}
        <section
          id="toolkit"
          className="home-enter home-enter-delay-2 mb-16"
          aria-labelledby="home-jobs-heading"
        >
          <div className="border-b border-slate-200 pb-6">
            <SectionHeading
              id="home-jobs-heading"
              eyebrow={t("jobsTitle")}
              eyebrowTone="brand"
              title={t("jobsTitle")}
              intro={t("jobsIntro")}
            />
          </div>
          <ul className="mt-8 grid list-none gap-5 p-0 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            <HomePathCard
              testId="home-path-comms"
              emphasized
              icon="megaphone"
              eyebrow="Comms"
              title={t("pathCommsTitle")}
              description={t("pathCommsDesc")}
              hint={t("pathCommsHint")}
              action={
                <ButtonLink
                  href={commsHref}
                  onClick={markWorkshopDemoSession}
                  className="w-full sm:w-auto"
                >
                  {themeEstablished
                    ? t("openFirstWeekCta")
                    : t("brandSetupCta")}
                </ButtonLink>
              }
            />
            <HomePathCard
              testId="home-path-steward"
              icon="shield"
              eyebrow="Steward"
              title={t("pathStewardTitle")}
              description={t("pathStewardDesc")}
              action={
                <ButtonLink
                  href="/guide/steward-playbooks"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  {t("pathStewardCta")}
                </ButtonLink>
              }
            />
            <HomePathCard
              testId="home-path-officer"
              icon="gear"
              eyebrow="Officer"
              title={t("pathOfficerTitle")}
              description={t(
                hubPublic ? "pathOfficerDesc" : "pathOfficerLearningDesc",
              )}
              action={
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  {hubPublic ? (
                    <ButtonLink href="/app" className="w-full sm:w-auto">
                      {t("pathOfficerCta")}
                    </ButtonLink>
                  ) : (
                    <>
                      <ButtonLink
                        href="/guide/officer-learning"
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        {t("pathOfficerLearningCta")}
                      </ButtonLink>
                      <p className="rounded-md bg-slate-100 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-700">
                        {t("pathOfficerCtaComingSoon")}
                      </p>
                    </>
                  )}
                </div>
              }
            />
          </ul>
        </section>

        {/* ---------- Workshop demo band ---------- */}
        <section
          className="home-enter home-enter-delay-2 mb-16"
          aria-label={t("workshopBandLabel")}
        >
          <Card
            variant="ghost"
            className="border-opseu-blue/30 bg-gradient-to-br from-opseu-blue/[0.06] via-white to-amber-50/70 sm:p-7"
          >
            <Eyebrow tone="brand">{t("workshopBandLabel")}</Eyebrow>
            <div className="mt-4">
              <WorkshopDemoPath />
            </div>
            <p className="mt-5 max-w-2xl border-t border-slate-200 pt-4 text-[0.9rem] leading-relaxed text-slate-700">
              {t(hubPublic ? "privacyNote" : "privacyNoteCommsOnly")}
            </p>
            <div className="mt-4">
              <ShareThisTool />
            </div>
          </Card>
        </section>

        {/* ---------- Channels grid ---------- */}
        <section
          className="home-enter home-enter-delay-3"
          aria-labelledby="home-channels-heading"
        >
          <div className="border-b border-slate-200 pb-6">
            <SectionHeading
              id="home-channels-heading"
              eyebrow={t("channelsTitle")}
              title={t("channelsTitle")}
              intro={t("channelsIntro")}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm">
            <nav
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
              aria-label={nav("brandKit")}
            >
              <ButtonLink href="/brand-kit" variant="ghost" size="sm">
                {nav("brandKit")}
              </ButtonLink>
              <span className="text-slate-300" aria-hidden>
                ·
              </span>
              <ButtonLink href="/tools/logo-builder" variant="ghost" size="sm">
                {nav("logoBuilder")}
                <span aria-hidden className="ml-1">→</span>
              </ButtonLink>
            </nav>
          </div>

          <ul className="mt-6 grid list-none gap-5 p-0 sm:gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {channelOrder.map((channel) => (
              <ChannelTile
                key={channel}
                id={channel}
                icon={
                  channel === "boards"
                    ? "board"
                    : channel === "print"
                      ? "print"
                      : channel === "social"
                        ? "share"
                        : "globe"
                }
                title={t(`channels.${channel}.title`)}
                description={t(`channels.${channel}.description`)}
                itemLinks={channelItems[channel]}
                itemLabel={(k) => nav(k)}
              />
            ))}
          </ul>
        </section>

        {/* ---------- Labour playbooks band ---------- */}
        <section
          className="home-enter home-enter-delay-3 mt-16"
          aria-labelledby="home-labour-playbooks"
        >
          <Card
            variant="default"
            className="overflow-hidden border-amber-300/70 bg-gradient-to-r from-amber-50 via-white to-opseu-blue/[0.06]"
          >
            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-3">
                <IconChip tone="amber" size="sm" className="bg-amber-200">
                  <Icon name="spark" />
                </IconChip>
                <div className="min-w-0">
                  <h2
                    id="home-labour-playbooks"
                    className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-amber-800"
                  >
                    {toolsIndex("labourPlaybooksTitle")}
                  </h2>
                  <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-slate-700">
                    {toolsIndex("labourPlaybooksIntro")}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-amber-200/60 pt-4">
                <ButtonLink
                  href="/guide/steward-playbooks"
                  variant="ghost"
                  trailingArrow
                  className="font-semibold"
                >
                  {toolsIndex("labourPlaybooksCta")}
                </ButtonLink>
                <ButtonLink href="/guide/social-media-plan" variant="ghost" size="sm">
                  {nav("firstWeek")}
                </ButtonLink>
              </div>
            </div>
          </Card>
        </section>
      </PageShell>
    </>
  );
}
