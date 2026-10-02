"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { HomeHeroPreview } from "@/components/pages/HomeHeroPreview";
import { HostedProductPreview } from "@/components/pages/HostedProductPreview";
import { HomeBrandReuse } from "@/components/pages/HomeBrandReuse";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HOME_WORK_GROUPS } from "@/lib/comms/home-work-links";
import { HERO_PREVIEW_VARIANTS, type HeroPreviewVariant } from "@/lib/comms/home-hero-preview";

const homeLinkClass = "inline-flex min-h-11 max-w-full items-center py-2 font-semibold text-opseu-dark underline decoration-opseu-blue underline-offset-4 hover:text-opseu-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50";

export function HomeContent() {
  const t = useTranslations("home");
  const [preview, setPreview] = useState<HeroPreviewVariant>("graphicMaker");

  return (
    <>
      <section className="home-hero w-full border-b border-slate-200 bg-white" aria-labelledby="home-hero-heading">
        <PageShell className="grid items-center gap-10 py-10 [overflow-wrap:anywhere] sm:py-14 lg:grid-cols-2 lg:gap-14 lg:py-16">
          <div className="min-w-0" data-testid="home-hero-brand">
            <Eyebrow>{t("heroEyebrow")}</Eyebrow>
            <h1 id="home-hero-heading" className="mt-3 max-w-2xl text-[clamp(2.1rem,4vw,3.25rem)] font-bold leading-[1.08] tracking-[-0.035em] text-opseu-dark">{t("headline")}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-700 sm:text-xl">{t("subtitle")}</p>
            <div className="mt-6 flex flex-col items-stretch gap-3 min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:items-center">
              <ButtonLink href="#home-work" trailingArrow>{t("exploreToolsCta")}</ButtonLink>
              <ButtonLink href="/platform" variant="outline">{t("explorePlatformCta")}</ButtonLink>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">{t("heroReassurance")}</p>
          </div>
          <div className="min-w-0 rounded-2xl bg-slate-50 p-4 sm:p-6">
            <p className="mb-3 text-sm font-semibold text-slate-700">{t("previewLabel")}</p>
            <HomeHeroPreview variant={preview} className="max-w-none" />
            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,6rem),1fr))] border-y border-slate-200" role="group" aria-label={t("previewChoicesLabel")}>
              {HERO_PREVIEW_VARIANTS.map((variant) => (
                <button key={variant} type="button" aria-pressed={preview === variant} onClick={() => setPreview(variant)} className="min-h-11 border-b-2 border-transparent px-2 py-2 text-left text-xs font-semibold leading-snug text-slate-700 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50 aria-pressed:border-opseu-blue aria-pressed:text-opseu-dark sm:px-3 sm:text-sm">
                  {t(`previewChoices.${variant}`)}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">{t("previewExampleNote")}</p>
          </div>
        </PageShell>
      </section>

      <PageShell className="py-12 [overflow-wrap:anywhere] md:py-16">
        <section id="home-work" aria-labelledby="home-work-heading" className="scroll-mt-[calc(var(--site-header-height,7rem)+1rem)]">
          <SectionHeading id="home-work-heading" title={t("workTitle")} />
          <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-6 lg:gap-10">
            {HOME_WORK_GROUPS.map(({ id, links }) => (
              <article key={id} className="min-w-0" aria-labelledby={`home-group-${id}`}>
                <h3 id={`home-group-${id}`} className="text-xl font-bold leading-snug text-opseu-dark">{t(`taskGroups.${id}.title`)}</h3>
                <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-700">{t(`taskGroups.${id}.body`)}</p>
                <ul className="mt-4 list-none p-0">
                  {links.map(({ id: linkId, href }) => (
                    <li key={linkId} data-testid={`home-work-${linkId}`}>
                      <Link href={href} className={homeLinkClass}>{t(`taskLinks.${linkId}`)}<span className="ml-2" aria-hidden="true">→</span></Link>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="mt-8 border-t border-slate-200 pt-4">
            <Link href="/start" className={homeLinkClass}>{t("earlySetupCta")}<span className="ml-2" aria-hidden="true">→</span></Link>
          </div>
        </section>
      </PageShell>

      <section className="bg-slate-50" aria-labelledby="home-brand-heading">
        <PageShell className="grid gap-8 py-12 [overflow-wrap:anywhere] md:py-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-12">
          <div>
            <SectionHeading id="home-brand-heading" title={t("brandTitle")} intro={t("brandBody")} />
            <ButtonLink href="/create/brand-kit" variant="outline" className="mt-5">{t("brandCta")}</ButtonLink>
          </div>
          <HomeBrandReuse />
        </PageShell>
      </section>

      <PageShell className="py-12 [overflow-wrap:anywhere] md:py-16">
        <section aria-labelledby="home-platform-heading" data-testid="home-platform">
          <SectionHeading id="home-platform-heading" title={t("platformTitle")} intro={t("platformIntro")} />
          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-12">
            {(["hub", "portal"] as const).map((audience) => (
              <article key={audience} className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-opseu-blue">{t(audience === "hub" ? "hubAudience" : "memberAudience")}</p>
                <h3 className="mt-2 text-xl font-bold text-opseu-dark">{t(`${audience}Title`)}</h3>
                <p className="mt-3 max-w-prose text-base leading-relaxed text-slate-700">{t(`${audience}Body`)}</p>
                <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-600">{t(`${audience}Boundary`)}</p>
                <HostedProductPreview audience={audience} />
                <Link href={`/platform#platform-${audience}-heading`} className={homeLinkClass}>{t(`${audience}DetailLink`)}<span className="ml-2" aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        </section>
      </PageShell>

      <section className="bg-slate-50" aria-labelledby="home-trust-heading">
        <PageShell className="py-12 [overflow-wrap:anywhere] md:py-16">
          <SectionHeading id="home-trust-heading" title={t("trustTitle")} />
          <dl className="mt-8 grid gap-8 md:grid-cols-3">
            {(["device", "hosted", "choice"] as const).map((item) => (
              <div key={item} className="min-w-0">
                <dt className="font-bold text-opseu-dark">{t(`trust.${item}.title`)}</dt>
                <dd className="mt-3 text-sm leading-relaxed text-slate-700">{t(`trust.${item}.body`)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/trust" className={homeLinkClass}>{t("trustLink")}</Link>
            <Link href="/documents/privacy" className={homeLinkClass}>{t("privacyLink")}</Link>
            <Link href="/documents/security" className={homeLinkClass}>{t("securityLink")}</Link>
          </div>
        </PageShell>
      </section>

      <PageShell className="py-12 [overflow-wrap:anywhere] md:py-16">
        <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between" aria-labelledby="home-next-heading">
          <SectionHeading id="home-next-heading" title={t("guidedSetupTitle")} intro={t("guidedSetupBody")} />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <ButtonLink href="/start" trailingArrow>{t("guidedSetupCta")}</ButtonLink>
            <Link href="/support" className={homeLinkClass}>{t("supportCta")}</Link>
          </div>
        </section>
      </PageShell>
    </>
  );
}
