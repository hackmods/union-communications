import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/dfr", params);
}

const TOC = [
  ["scope", "scope"],
  ["whatItMeans", "whatItMeans"],
  ["legalTest", "legalTest"],
  ["failureModes", "failureModes"],
  ["workedExample", "workedExample"],
  ["practice", "practice"],
] as const;

const scopeItemKeys = ["ontario", "college", "federal"] as const;
const workedStepKeys = ["day0", "investigate", "decide", "decline"] as const;

export default async function DfrGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dfrGuide");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLinks={[
        { href: "/guide", label: t("backToGuide") },
        { href: "/guide/seniority-bumping", label: t("related.seniority") },
        { href: "/guide/right-to-refuse", label: t("related.rightToRefuse") },
      ]}
      footer={
        <SourcesBlock pageId="dfr" title={ts("title")} intro={ts("intro")} />
      }
    >
      <Callout className="mb-8">
        <p className="font-semibold text-opseu-dark">{t("disclaimer.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("disclaimer.body")}
        </p>
      </Callout>

      <nav
        className="mb-8 flex flex-wrap gap-2"
        aria-label={t("tocLabel")}
      >
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
        id="scope"
        className="scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
      >
        <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">
          {t("scope.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("scope.content")}
        </p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-gray-700">
          {scopeItemKeys.map((key) => (
            <li key={key}>
              <span className="font-semibold text-opseu-dark">
                {t(`scope.items.${key}.label`)}
              </span>
              {" — "}
              {t(`scope.items.${key}.content`)}
            </li>
          ))}
        </ul>
      </section>

      {(["whatItMeans", "legalTest", "failureModes"] as const).map((key) => (
        <section
          key={key}
          id={key}
          className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
        >
          <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">
            {t(`${key}.title`)}
          </h2>
          <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
            {t(`${key}.content`)}
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            {(t.raw(`${key}.items`) as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}

      <section
        id="workedExample"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
      >
        <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">
          {t("workedExample.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("workedExample.content")}
        </p>
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-gray-700">
          {workedStepKeys.map((key) => (
            <li key={key}>
              <span className="font-semibold text-opseu-dark">
                {t(`workedExample.steps.${key}.label`)}
              </span>
              <p className="mt-1">{t(`workedExample.steps.${key}.content`)}</p>
            </li>
          ))}
        </ol>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("tipLabel")}</p>
          <p className="mt-1">{t("workedExample.tip")}</p>
        </Callout>
      </section>

      <section
        id="practice"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
      >
        <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">
          {t("practice.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("practice.content")}
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          {(t.raw("practice.items") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <Callout tone="muted" className="mt-10">
        <p className="font-semibold text-opseu-dark">{t("hub.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("hub.body")}</p>
        <p className="mt-3 text-sm">
          <Link
            href="/app/grievances"
            className="font-medium text-opseu-blue underline"
          >
            {t("hub.cta")}
          </Link>
        </p>
      </Callout>
    </GuideLayout>
  );
}
