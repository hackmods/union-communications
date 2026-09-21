"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { HomeHeroPreview } from "@/components/pages/HomeHeroPreview";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useBrandStore } from "@/store/brand-store";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { useSession } from "next-auth/react";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";

export function HomeContent() {
  const t = useTranslations("home");
  const catalog = useTranslations("publicCatalog");
  const nav = useTranslations("nav");
  const brandKit = useBrandStore((state) => state.brandKit);
  const onboardingComplete = useBrandStore((state) => state.onboardingComplete);
  const hydrated = useBrandStore((state) => state.hydrated);
  const brandReady = hydrated && isBrandThemeEstablished(brandKit, onboardingComplete);
  const { data: session, status } = useSession();
  const hubAvailable =
    (status === "authenticated" && Boolean(session?.user)) || isOfficerHubPublic();

  const paths = [
    {
      key: "comms",
      title: catalog("startPaths.commsTitle"),
      body: catalog("startPaths.commsBody"),
      href: brandReady ? "/learn/first-week" : "/create/brand-kit",
      cta: brandReady ? catalog("startPaths.commsCta") : nav("brandKit"),
    },
    {
      key: "steward",
      title: catalog("startPaths.stewardTitle"),
      body: catalog("startPaths.stewardBody"),
      href: "/learn/steward",
      cta: catalog("startPaths.stewardCta"),
    },
    {
      key: "officer",
      title: catalog("startPaths.officerTitle"),
      body: catalog("startPaths.officerBody"),
      href: "/learn/officer",
      cta: catalog("startPaths.officerCta"),
    },
  ];

  return (
    <>
      <section
        className="home-hero relative w-full overflow-hidden bg-gradient-to-br from-opseu-blue via-opseu-blue to-opseu-dark text-white"
        aria-labelledby="home-hero-heading"
      >
        <div className={cn(PAGE_SHELL.wide, "grid grid-cols-1 items-center gap-8 py-10 sm:py-14 lg:grid-cols-2 lg:gap-12 lg:py-16")}>
          <div className="min-w-0" data-testid="home-hero-brand">
            <Eyebrow className="text-white/80">UnionOps</Eyebrow>
            <h1 id="home-hero-heading" className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              {t("headline")}
            </h1>
            <p className="mt-4 text-2xl font-semibold tracking-wide text-white sm:text-3xl">
              {t("slogan")}
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
              {t(hubAvailable ? "subtitle" : "subtitleCommsOnly")}
            </p>
            <div className="mt-7">
              <ButtonLink href="/start" variant="outline" className="border-white bg-white text-opseu-dark hover:bg-white/90">
                {catalog("startCta")}
              </ButtonLink>
            </div>
          </div>
          <HomeHeroPreview className="justify-self-stretch lg:justify-self-end" />
        </div>
      </section>

      <PageShell className="py-8 md:py-12">
        <Callout tone="plain" className="border border-amber-200 bg-amber-50/80 p-4 sm:p-5" role="note">
          <p className="text-sm leading-relaxed text-amber-950 sm:text-base">
            {t(hubAvailable ? "trustBanner" : "trustBannerCommsOnly")} {" "}
            <Link href="/manifesto" className="font-semibold underline underline-offset-2">
              {t("trustManifestoLink")}
            </Link>
          </p>
        </Callout>

        <section className="mt-10" aria-labelledby="home-task-heading">
          <SectionHeading
            id="home-task-heading"
            eyebrow={catalog("startEyebrow")}
            title={catalog("startTitle")}
            intro={catalog("startIntro")}
          />
          <ul className="mt-6 grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
            {paths.map((path, index) => (
            <li key={path.key} className="min-w-0" data-testid={`home-path-${path.key}`}>
                <Card variant="elevated" interactive className="h-full p-0">
                  <Link
                    href={path.href}
                    className="block h-full rounded-xl p-5 outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50 focus-visible:ring-inset sm:p-6"
                  >
                    <Eyebrow tone={index === 0 ? "brand" : "muted"}>
                      {catalog(`audiences.${path.key}` as never)}
                    </Eyebrow>
                    <h3 className="mt-3 text-xl font-bold text-opseu-dark group-hover/card:text-opseu-blue">
                      {path.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{path.body}</p>
                    <span className="mt-5 inline-flex min-h-10 items-center font-semibold text-opseu-blue underline-offset-2 group-hover/card:underline">
                      {path.cta}<span aria-hidden="true" className="ml-2">→</span>
                    </span>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      </PageShell>
    </>
  );
}
