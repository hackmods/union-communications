"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { OFFICER_LEARNING_MODULES } from "@/lib/officer-learning/modules";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { HomeHeroPreview } from "@/components/pages/HomeHeroPreview";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HOME_MORE_WORK_LINKS, HOME_WORK_LINKS } from "@/lib/comms/home-work-links";
import {
  HERO_PREVIEW_VARIANTS,
  type HeroPreviewVariant,
} from "@/lib/comms/home-hero-preview";

export function HomeContent() {
  const t = useTranslations("home");
  const tLearning = useTranslations("officerLearning");
  const [preview, setPreview] = useState<HeroPreviewVariant>("graphicMaker");
  const featuredLearningModule = OFFICER_LEARNING_MODULES.find(
    (module) => module.slug === "contract-enforcement",
  );

  if (!featuredLearningModule) {
    throw new Error("The featured Officer Learning module is missing.");
  }

  return (
    <>
      <section className="home-hero w-full border-b border-slate-200 bg-white" aria-labelledby="home-hero-heading">
        <PageShell className="grid min-h-[32rem] items-center gap-10 py-10 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:py-16">
          <div className="min-w-0" data-testid="home-hero-brand">
            <Eyebrow>{t("heroEyebrow")}</Eyebrow>
            <h1 id="home-hero-heading" className="mt-3 max-w-2xl text-[clamp(2.35rem,5.3vw,4.25rem)] font-bold leading-[1.03] tracking-[-0.045em] text-opseu-dark">
              {t("headline")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-700 sm:text-xl">
              {t("subtitle")}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              {t("heroBreadth")}
            </p>
            <div className="mt-7 flex flex-col items-stretch gap-3 min-[420px]:flex-row min-[420px]:items-center">
              <ButtonLink href="#home-work" trailingArrow>{t("exploreToolsCta")}</ButtonLink>
              <ButtonLink href="/platform" variant="outline">{t("explorePlatformCta")}</ButtonLink>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              {t("heroPrivacyLine")} {" "}
              <Link href="/documents/privacy" className="font-semibold text-opseu-dark underline decoration-opseu-blue underline-offset-4">
                {t("privacyLink")}
              </Link>
            </p>
          </div>

          <div className="min-w-0 border-t-2 border-opseu-blue pt-4 lg:border-t-0 lg:border-l-2 lg:pl-7 lg:pt-0">
            <p className="mb-3 text-sm font-semibold text-slate-700">{t("previewLabel")}</p>
            <HomeHeroPreview variant={preview} className="max-w-none" />
            <div className="mt-4 grid grid-cols-3 border-y border-slate-200" role="group" aria-label={t("previewChoicesLabel")}>
              {HERO_PREVIEW_VARIANTS.map((variant) => (
                <button
                  key={variant}
                  type="button"
                  aria-pressed={preview === variant}
                  onClick={() => setPreview(variant)}
                  className="min-h-11 border-b-2 border-transparent px-2 py-2 text-left text-xs font-semibold leading-snug text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50 aria-pressed:border-opseu-blue aria-pressed:text-opseu-dark sm:px-3 sm:text-sm"
                >
                  {t(`previewChoices.${variant}`)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("previewExampleNote")}</p>
          </div>
        </PageShell>
      </section>

      <PageShell className="py-10 md:py-14">
        <section id="home-work" aria-labelledby="home-work-heading" className="scroll-mt-28">
          <SectionHeading
            id="home-work-heading"
            eyebrow={t("workEyebrow")}
            title={t("workTitle")}
            intro={t("workIntro")}
          />
          <ul className="mt-7 grid list-none grid-cols-1 gap-x-10 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {HOME_WORK_LINKS.map(({ id, href }, index) => (
              <li key={id} className="min-w-0 border-t border-slate-300 py-4" data-testid={`home-work-${id}`}>
                <p className="text-xs font-semibold tabular-nums text-opseu-blue">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-1 text-lg font-bold leading-snug text-opseu-dark">{t(`work.${id}.title`)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{t(`work.${id}.body`)}</p>
                <Link href={href} className="mt-2 inline-flex min-h-11 items-center font-semibold text-opseu-dark underline decoration-opseu-blue underline-offset-4 hover:text-opseu-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50">
                  {t(`work.${id}.link`)} <span className="ml-2" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-200 pt-4 text-sm text-slate-600">
            <span className="mr-1 font-semibold text-slate-800">{t("moreWorkLabel")}</span>
            {HOME_MORE_WORK_LINKS.map(({ id, href }, index) => (
              <span key={id} className="inline-flex items-center gap-2">
                {index > 0 ? <span aria-hidden="true">·</span> : null}
                <Link href={href} className="inline-flex min-h-11 items-center font-medium text-opseu-dark underline decoration-slate-400 underline-offset-4 hover:decoration-opseu-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50">{t(`moreWork.${id}`)}</Link>
              </span>
            ))}
          </p>
        </section>

        <section
          className="mt-12 grid gap-6 border-y border-slate-300 py-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-12 lg:py-8"
          aria-labelledby="home-learning-heading"
        >
          <div>
            <Eyebrow>{t("learningEyebrow")}</Eyebrow>
            <h2
              id="home-learning-heading"
              className="mt-2 text-2xl font-bold tracking-tight text-opseu-dark sm:text-3xl"
            >
              {t("learningTitle")}
            </h2>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-700 sm:text-base">
              {t("learningBody")}
            </p>
          </div>
          <article
            className="min-w-0 border-l-2 border-opseu-blue pl-4 sm:pl-6"
            data-testid="home-learning-preview"
            aria-labelledby="home-learning-module-title"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <span>{tLearning("moduleLabel", { number: featuredLearningModule.number })}</span>
              <span aria-hidden="true">·</span>
              <span>{tLearning("moduleQuizBadge")}</span>
            </div>
            <h3
              id="home-learning-module-title"
              className="mt-2 text-xl font-bold leading-snug text-opseu-dark"
            >
              <Link
                href={`/learn/officer/${featuredLearningModule.slug}`}
                className="underline decoration-opseu-blue decoration-2 underline-offset-4 hover:text-opseu-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
              >
                {tLearning("modules.contract-enforcement.title")}
              </Link>
            </h3>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-700">
              {tLearning("modules.contract-enforcement.summary")}
            </p>
          </article>
        </section>

        <section className="mt-14 grid gap-6 border-y-2 border-slate-300 py-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-12" aria-labelledby="home-brand-heading">
          <div>
            <Eyebrow>{t("brandEyebrow")}</Eyebrow>
            <h2 id="home-brand-heading" className="mt-2 text-2xl font-bold tracking-tight text-opseu-dark sm:text-3xl">{t("brandTitle")}</h2>
          </div>
          <div>
            <p className="max-w-prose text-base leading-relaxed text-slate-700">{t("brandBody")}</p>
            <ButtonLink href="/create/brand-kit" variant="outline" className="mt-4">{t("brandCta")}</ButtonLink>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="home-platform-heading" data-testid="home-platform">
          <SectionHeading id="home-platform-heading" eyebrow={t("platformEyebrow")} title={t("platformTitle")} intro={t("platformIntro")} />
          <div className="mt-7 grid gap-8 lg:grid-cols-2 lg:gap-12">
            <article className="min-w-0 border-t-2 border-opseu-blue pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-opseu-blue">{t("hubAudience")}</p>
              <h3 className="mt-2 text-xl font-bold text-opseu-dark">{t("hubTitle")}</h3>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-700">{t("hubBody")}</p>
              <p className="mt-3 max-w-prose text-sm font-medium leading-relaxed text-slate-700">{t("hubBoundary")}</p>
              <Link href="/platform" className="mt-3 inline-flex min-h-11 items-center font-semibold text-opseu-dark underline decoration-opseu-blue underline-offset-4">{t("platformDetailLink")} →</Link>
            </article>
            <article className="min-w-0 border-t-2 border-slate-400 pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{t("memberAudience")}</p>
              <h3 className="mt-2 text-xl font-bold text-opseu-dark">{t("portalTitle")}</h3>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-700">{t("portalBody")}</p>
              <p className="mt-3 max-w-prose text-sm font-medium leading-relaxed text-slate-700">{t("portalBoundary")}</p>
              <Link href="/platform" className="mt-3 inline-flex min-h-11 items-center font-semibold text-opseu-dark underline decoration-opseu-blue underline-offset-4">{t("platformDetailLink")} →</Link>
            </article>
          </div>
        </section>

        <section className="mt-14 border-t border-slate-300 pt-7" aria-labelledby="home-trust-heading">
          <SectionHeading id="home-trust-heading" eyebrow={t("trustEyebrow")} title={t("trustTitle")} intro={t("trustIntro")} />
          <dl className="mt-6 grid gap-x-8 sm:grid-cols-3">
            {(["device", "hosted", "choice"] as const).map((item) => (
              <div key={item} className="border-t border-slate-300 py-4">
                <dt className="font-bold text-opseu-dark">{t(`trust.${item}.title`)}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-700">{t(`trust.${item}.body`)}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200 pt-3 text-sm font-semibold">
            <Link href="/documents/privacy" className="min-h-11 inline-flex items-center text-opseu-dark underline decoration-opseu-blue underline-offset-4">{t("privacyLink")}</Link>
            <Link href="/security" className="min-h-11 inline-flex items-center text-opseu-dark underline decoration-opseu-blue underline-offset-4">{t("securityLink")}</Link>
          </div>
        </section>

        <section className="mt-14 flex flex-col gap-5 border-t border-slate-300 pt-7 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="home-next-heading">
          <div>
            <Eyebrow>{t("nextEyebrow")}</Eyebrow>
            <h2 id="home-next-heading" className="mt-2 text-xl font-bold text-opseu-dark">{t("guidedSetupTitle")}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-700">{t("guidedSetupBody")}</p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <ButtonLink href="/start" variant="outline">{t("guidedSetupCta")}</ButtonLink>
            <ButtonLink href="/create">{t("browseAllToolsCta")}</ButtonLink>
          </div>
        </section>
      </PageShell>
    </>
  );
}
