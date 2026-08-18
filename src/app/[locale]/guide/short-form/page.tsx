import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Card, CardTitle } from "@/components/ui/Card";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
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
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/guide/photo-consent", label: nav("photoConsent") },
        { href: "/captions", label: nav("captions") },
        { href: "/tools/graphic-maker", label: nav("graphicMaker") },
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
      <nav className="mb-8 flex flex-wrap gap-2" aria-label={t("tocLabel")}>
        {TOC.map(([id, key]) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-opseu-dark transition-colors hover:border-opseu-blue/40 hover:bg-opseu-blue/5"
          >
            {t(`${key}.navLabel`)}
          </a>
        ))}
      </nav>

      <section
        id="filming"
        className="scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="filming-heading"
      >
        <h2
          id="filming-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("filming.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("filming.content")}
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          {filmingItemKeys.map((key) => (
            <li key={key}>{t(`filming.items.${key}`)}</li>
          ))}
        </ul>

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
      </section>

      <section
        id="editing"
        className="mt-10 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="editing-heading"
      >
        <h2
          id="editing-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("editing.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("editing.content")}
        </p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
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
      </section>

      <section
        id="strategy"
        className="mt-10 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="strategy-heading"
      >
        <h2
          id="strategy-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("strategy.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("strategy.content")}
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          {strategyItemKeys.map((key) => (
            <li key={key}>{t(`strategy.items.${key}`)}</li>
          ))}
        </ul>
      </section>

      <section
        id="checklist"
        className="mt-10 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        aria-labelledby="checklist-heading"
      >
        <h2
          id="checklist-heading"
          className="text-xl font-bold text-opseu-dark md:text-2xl"
        >
          {t("checklist.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("checklist.intro")}
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          {checklistItemKeys.map((key) => (
            <li key={key}>{t(`checklist.items.${key}`)}</li>
          ))}
        </ul>
      </section>

      <div className="button-row mt-8 max-w-lg">
        <Link href="/tools/graphic-maker">
          <Button variant="outline">{nav("graphicMaker")}</Button>
        </Link>
        <Link href="/tools/resizer">
          <Button variant="outline">{nav("resizer")}</Button>
        </Link>
        <Link href="/captions">
          <Button variant="outline">{nav("captions")}</Button>
        </Link>
        <Link href="/guide/photo-consent">
          <Button variant="outline">{nav("photoConsent")}</Button>
        </Link>
      </div>
    </GuideLayout>
  );
}
