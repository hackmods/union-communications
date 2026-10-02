"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Callout } from "@/components/ui/Callout";
import { Card, CardTitle } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { HomeHeroPreview } from "@/components/pages/HomeHeroPreview";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useBrandStore } from "@/store/brand-store";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { useSession } from "next-auth/react";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import {
  PUBLIC_HERO_TITLE_CLASS,
  PUBLIC_SECTION_TITLE_CLASS,
} from "@/lib/constants/public-type";
import { cn } from "@/lib/utils";

export function HomeContent() {
  const t = useTranslations("home");
  const nav = useTranslations("nav");
  const brandKit = useBrandStore((state) => state.brandKit);
  const onboardingComplete = useBrandStore((state) => state.onboardingComplete);
  const hydrated = useBrandStore((state) => state.hydrated);
  const brandReady = hydrated && isBrandThemeEstablished(brandKit, onboardingComplete);
  const { data: session, status } = useSession();
  const hubAvailable =
    (status === "authenticated" && Boolean(session?.user)) || isOfficerHubPublic();

  const primaryHref = brandReady ? "/create" : "/create/brand-kit";
  const primaryCta = brandReady ? t("openToolsCta") : t("primaryCta");

  const destinations = [
    {
      id: "create",
      title: t("destCreateTitle"),
      body: t("destCreateBody"),
      href: "/create",
      cta: nav("create"),
    },
    {
      id: "utilities",
      title: t("destUtilitiesTitle"),
      body: t("destUtilitiesBody"),
      href: "/utilities",
      cta: nav("utilities"),
    },
    {
      id: "learn",
      title: t("destLearnTitle"),
      body: t("destLearnBody"),
      href: "/learn",
      cta: nav("learn"),
    },
  ];

  return (
    <>
      <section
        className="home-hero relative w-full overflow-hidden bg-gradient-to-br from-opseu-blue via-opseu-blue to-opseu-dark text-white"
        aria-labelledby="home-hero-heading"
      >
        <div
          className={cn(
            PAGE_SHELL.wide,
            "grid grid-cols-1 items-center gap-8 py-12 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:py-20",
          )}
        >
          <div className="home-enter min-w-0" data-testid="home-hero-brand">
            <Eyebrow className="text-white/80">UnionOps</Eyebrow>
            <h1
              id="home-hero-heading"
              className={cn(PUBLIC_HERO_TITLE_CLASS, "mt-3 max-w-2xl text-white")}
            >
              {t("headline")}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg sm:leading-[1.7]">
              {t(hubAvailable ? "subtitle" : "subtitleCommsOnly")}
            </p>
            <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-white/85 sm:text-base">
              {t("brandFoundation")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink
                href={primaryHref}
                variant="outline"
                className="border-white bg-white text-opseu-dark hover:bg-white/90"
              >
                {primaryCta}
              </ButtonLink>
              <ButtonLink
                href="/platform"
                variant="outline"
                className="border-white/70 bg-transparent text-white hover:bg-white/10"
              >
                {t("explorePlatformCta")}
              </ButtonLink>
            </div>
          </div>
          <HomeHeroPreview className="justify-self-stretch lg:justify-self-end" />
        </div>
      </section>

      <PageShell className="py-10 md:py-14">
        <Callout
          tone="plain"
          className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
          role="note"
        >
          <p className="text-sm leading-relaxed text-slate-800 sm:text-base">
            {t(hubAvailable ? "privacySummary" : "privacySummaryCommsOnly")}{" "}
            <Link
              href="/documents/privacy"
              className="font-semibold underline underline-offset-2 transition-colors hover:text-opseu-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
            >
              {t("privacyLink")}
            </Link>
          </p>
        </Callout>

        <section
          className="mt-10 md:mt-14"
          aria-labelledby="home-foundation-heading"
          data-testid="home-foundation"
        >
          <SectionHeading
            id="home-foundation-heading"
            eyebrow={t("foundationEyebrow")}
            title={t("foundationTitle")}
            intro={t("foundationIntro")}
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/create/brand-kit">{nav("brandKit")}</ButtonLink>
            {hydrated ? (
              <p className="self-center text-sm text-slate-600">
                {brandReady ? t("foundationReady") : t("foundationHint")}
              </p>
            ) : null}
          </div>
        </section>

        <section className="mt-10 md:mt-14" aria-labelledby="home-destinations-heading">
          <SectionHeading
            id="home-destinations-heading"
            eyebrow={t("destinationsEyebrow")}
            title={t("destinationsTitle")}
            intro={t("destinationsIntro")}
          />
          <ul className="mt-6 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {destinations.map((item) => (
              <li key={item.id} className="min-w-0" data-testid={`home-dest-${item.id}`}>
                <Card variant="elevated" interactive className="relative h-full">
                  <Link
                    href={item.href}
                    className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50 focus-visible:ring-inset"
                    aria-label={`${item.title}: ${item.cta}`}
                  />
                  <CardTitle className="group-hover/card:text-opseu-blue">{item.title}</CardTitle>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.body}</p>
                  <span
                    aria-hidden="true"
                    className="mt-5 inline-flex min-h-11 items-center font-semibold text-opseu-blue underline underline-offset-2 group-hover/card:text-opseu-dark"
                  >
                    {item.cta}
                    <span className="ml-2">→</span>
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="mt-10 rounded-xl border border-slate-200/80 bg-gradient-to-br from-opseu-blue/[0.04] to-slate-50 p-5 shadow-sm sm:p-7 md:mt-14"
          aria-labelledby="home-platform-heading"
          data-testid="home-platform"
        >
          <h2 id="home-platform-heading" className={PUBLIC_SECTION_TITLE_CLASS}>
            {t("platformBandTitle")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base sm:leading-[1.7]">
            {t("platformBandBody")}
          </p>
          <ButtonLink href="/platform" className="mt-5 w-full sm:w-auto">
            {t("platformBandCta")}
          </ButtonLink>
        </section>

        <section
          className="mt-10 flex flex-col gap-4 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:justify-between md:mt-14"
          aria-labelledby="home-guided-setup-heading"
        >
          <div>
            <h2 id="home-guided-setup-heading" className={PUBLIC_SECTION_TITLE_CLASS}>
              {t("guidedSetupTitle")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">
              {t("guidedSetupBody")}
            </p>
          </div>
          <ButtonLink href="/start" variant="outline" className="w-full shrink-0 sm:w-auto">
            {t("guidedSetupCta")}
          </ButtonLink>
        </section>
      </PageShell>
    </>
  );
}
