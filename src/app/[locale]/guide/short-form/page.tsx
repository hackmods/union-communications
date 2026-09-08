import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";
import { Card, CardTitle } from "@/components/ui/Card";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { GuideToolAside } from "@/components/comms/GuideToolAside";
import {
  GuideSection,
  GuideActionRow,
  GuideBulletList,
} from "@/components/comms/guide-ui";
import { guideTocItems } from "@/lib/comms/guide-toc-items";
import { guideCtaOutlineClass } from "@/components/comms/guideCtaClasses";
import { SHORT_FORM_EDITORS } from "@/lib/constants/short-form-editors";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/short-form", params);
}

const TOC = [
  ["filming", "filming"],
  ["editing", "editing"],
  ["strategy", "strategy"],
  ["checklist", "checklist"],
] as const;

const filmingItemKeys = [
  "vertical",
  "light",
  "audio",
  "background",
  "consent",
] as const;

const strategyItemKeys = ["hook", "oneAsk", "handoff", "platform"] as const;

const checklistItemKeys = [
  "consent",
  "cover",
  "caption",
  "alt",
  "ask",
] as const;

export default async function ShortFormGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shortFormGuide");
  const nav = await getTranslations("nav");
  const tg = await getTranslations("guideCommon");
  const ts = await getTranslations("sources");

  const tocItems = guideTocItems(TOC, (key) => t(`${key}.navLabel`));

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      preset="playbook"
      toc={tocItems}
      tocLabel={t("tocLabel")}
      aside={
        <GuideToolAside
          title={tg("asideTitle")}
          intro={tg("asideIntro")}
          links={[
            {
              href: "/tools/graphic-maker?aspect=portrait",
              label: nav("graphicMaker"),
            },
            { href: "/captions", label: nav("captions"), variant: "outline" },
            { href: "/examples", label: nav("socialExamples"), variant: "outline" },
          ]}
        />
      }
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/guide/photo-consent", label: nav("photoConsent") },
        { href: "/captions", label: nav("captions") },
        { href: "/tools/graphic-maker?aspect=portrait", label: nav("graphicMaker") },
        { href: "/tools/resizer", label: nav("resizer") },
        { href: "/guide/social-media-plan", label: nav("socialMediaPlan") },
        { href: "/examples", label: nav("socialExamples") },
      ]}
      footer={
        <SourcesBlock
          pageId="shortForm"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <GuideSection
        id="filming"
        title={t("filming.title")}
        intro={t("filming.content")}
      >
        <GuideBulletList className="mt-3">
          {filmingItemKeys.map((key) => (
            <li key={key}>{t(`filming.items.${key}`)}</li>
          ))}
        </GuideBulletList>

        <figure className="mt-6 max-w-md">
          <div className="flex items-end gap-4">
            <div className="flex w-16 flex-col items-center gap-2">
              <div
                className="aspect-[9/16] w-full rounded-md border-2 border-opseu-blue bg-opseu-blue/10"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-opseu-dark">
                {t("aspect.portrait")}
              </span>
            </div>
            <div className="flex w-16 flex-col items-center gap-2">
              <div
                className="aspect-square w-full rounded-md border border-gray-300 bg-gray-50"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-gray-600">
                {t("aspect.square")}
              </span>
            </div>
            <div className="flex w-28 flex-col items-center gap-2">
              <div
                className="aspect-[16/9] w-full rounded-md border border-gray-300 bg-gray-50"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-gray-600">
                {t("aspect.landscape")}
              </span>
            </div>
          </div>
          <figcaption className="mt-3 max-w-prose text-sm text-gray-600">
            {t("aspect.caption")}
          </figcaption>
        </figure>

        <Callout className="mt-6">
          <p className="font-semibold text-opseu-dark">
            {t("filming.consentTitle")}
          </p>
          <p className="mt-2 leading-relaxed">{t("filming.consentBody")}</p>
          <Link
            href="/guide/photo-consent"
            className="mt-2 inline-block font-medium text-opseu-blue underline"
          >
            {nav("photoConsent")} →
          </Link>
        </Callout>
      </GuideSection>

      <GuideSection
        id="editing"
        title={t("editing.title")}
        intro={t("editing.content")}
      >
        <ul className="mt-6 grid list-none gap-4 p-0 sm:grid-cols-2">
          {SHORT_FORM_EDITORS.map((editor) => (
            <li key={editor.id}>
              <Card density="compact" className="h-full">
                <CardTitle className="text-base">
                  {t(`editors.${editor.id}.name`)}
                </CardTitle>
                <p className="mt-2 text-sm font-medium text-opseu-dark">
                  {t(`pricing.${editor.pricing}`)}
                  <span className="text-gray-400" aria-hidden="true">
                    {" "}
                    ·{" "}
                  </span>
                  {t(`privacy.${editor.privacy}`)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">
                  {t(`editors.${editor.id}.when`)}
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
                  {editor.useCaseIds.map((useCase) => (
                    <li key={useCase}>{t(`useCases.${useCase}`)}</li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>

        <Callout tone="muted" className="mt-6">
          <p className="font-semibold text-opseu-dark">
            {t("editing.stillsTitle")}
          </p>
          <p className="mt-2 leading-relaxed">{t("editing.stillsBody")}</p>
        </Callout>
      </GuideSection>

      <GuideSection
        id="strategy"
        title={t("strategy.title")}
        intro={t("strategy.content")}
      >
        <GuideBulletList className="mt-3">
          {strategyItemKeys.map((key) => (
            <li key={key}>{t(`strategy.items.${key}`)}</li>
          ))}
        </GuideBulletList>
      </GuideSection>

      <GuideSection
        id="checklist"
        title={t("checklist.title")}
        intro={t("checklist.intro")}
      >
        <GuideBulletList className="mt-3">
          {checklistItemKeys.map((key) => (
            <li key={key}>{t(`checklist.items.${key}`)}</li>
          ))}
        </GuideBulletList>
      </GuideSection>

      <GuideActionRow className="mt-8">
        <Link
          href="/tools/graphic-maker?aspect=portrait"
          className={guideCtaOutlineClass}
        >
          {nav("graphicMaker")}
        </Link>
        <Link href="/tools/resizer" className={guideCtaOutlineClass}>
          {nav("resizer")}
        </Link>
        <Link href="/captions" className={guideCtaOutlineClass}>
          {nav("captions")}
        </Link>
        <Link href="/guide/photo-consent" className={guideCtaOutlineClass}>
          {nav("photoConsent")}
        </Link>
      </GuideActionRow>
    </GuideLayout>
  );
}
