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
  const steps = [
    {
      id: "brand-kit",
      number: "01",
      title: t("workflowBrandKitTitle"),
      body: t("workflowBrandKitBody"),
      href: "/create/brand-kit",
      cta: nav("brandKit"),
    },
    {
      id: "create",
      number: "02",
      title: t("workflowCreateTitle"),
      body: t("workflowCreateBody"),
      href: "/create",
      cta: nav("create"),
    },
    {
      id: "utilities",
      number: "03",
      title: t("workflowUtilitiesTitle"),
      body: t("workflowUtilitiesBody"),
      href: "/utilities",
      cta: nav("utilities"),
    },
    {
      id: "learn",
      number: "04",
      title: t("workflowLearnTitle"),
      body: t("workflowLearnBody"),
      href: "/learn",
      cta: nav("learn"),
    },
    {
      id: "platform",
      number: "05",
      title: t("workflowPlatformTitle"),
      body: t("workflowPlatformBody"),
      href: "/platform",
      cta: nav("platform"),
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
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
              {t(hubAvailable ? "subtitle" : "subtitleCommsOnly")}
            </p>
            <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-white/85 sm:text-base">
              {t("brandFoundation")}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ButtonLink href={primaryHref} variant="outline" className="border-white bg-white text-opseu-dark hover:bg-white/90">
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

      <PageShell className="py-8 md:py-12">
        <Callout tone="plain" className="border border-slate-200 bg-slate-50 p-4 sm:p-5" role="note">
          <p className="text-sm leading-relaxed text-slate-800 sm:text-base">
            {t(hubAvailable ? "privacySummary" : "privacySummaryCommsOnly")} {" "}
            <Link href="/privacy" className="font-semibold underline underline-offset-2">
              {t("privacyLink")}
            </Link>
          </p>
        </Callout>

        <section className="mt-10" aria-labelledby="home-task-heading">
          <SectionHeading
            id="home-task-heading"
            eyebrow={t("workflowEyebrow")}
            title={t("workflowTitle")}
            intro={t("workflowIntro")}
          />
          <ol className="mt-6 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {steps.map((step) => (
              <li key={step.id} className="min-w-0" data-testid={`home-step-${step.id}`}>
                <Card variant="ghost" className="h-full border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-opseu-blue text-sm font-bold text-white">
                      {step.number}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-opseu-dark">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">{step.body}</p>
                    </div>
                  </div>
                  <Link href={step.href} className="mt-5 inline-flex min-h-10 items-center font-semibold text-opseu-blue underline underline-offset-2 hover:text-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50">
                    {step.cta}<span aria-hidden="true" className="ml-2">→</span>
                  </Link>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="home-guided-setup-heading">
          <div>
            <h2 id="home-guided-setup-heading" className="text-lg font-bold text-opseu-dark">{t("guidedSetupTitle")}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-700">{t("guidedSetupBody")}</p>
          </div>
          <ButtonLink href="/start" variant="outline" className="shrink-0">
            {t("guidedSetupCta")}
          </ButtonLink>
        </section>
      </PageShell>
    </>
  );
}
