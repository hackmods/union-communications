import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/crisis", params);
}

const scenarioKeys = ["strike", "bargaining", "layoffs", "management"] as const;

const TOC = [
  ...scenarioKeys.map((key) => [key, key] as const),
  ["workedDay", "workedDay"],
  ["escalation", "escalation"],
  ["tools", "tools"],
] as const;

export default async function CrisisPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("crisisGuide");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLinks={[{ href: "/guide", label: t("backToGuide") }]}
      footer={
        <SourcesBlock pageId="crisis" title={ts("title")} intro={ts("intro")} />
      }
    >
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
            {key === "workedDay" || key === "escalation" || key === "tools"
              ? t(`${key}.navLabel`)
              : t(`scenarios.${key}.navLabel`)}
          </a>
        ))}
      </nav>

      {scenarioKeys.map((key) => (
        <section
          key={key}
          id={key}
          className="scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5 not-first:mt-12"
        >
          <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">
            {t(`scenarios.${key}.title`)}
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            {(t.raw(`scenarios.${key}.items`) as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}

      <section
        id="workedDay"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
      >
        <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">
          {t("workedDay.title")}
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
          {t("workedDay.content")}
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          {(t.raw("workedDay.items") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Callout className="mt-5 max-w-prose">
          <p className="font-semibold text-opseu-dark">{t("workedDay.tip")}</p>
        </Callout>
      </section>

      <section
        id="escalation"
        className="mt-12 scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
      >
        <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">
          {t("escalation.title")}
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          {(t.raw("escalation.items") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="tools" className="mt-10 scroll-mt-28">
        <Callout>
          <p className="font-semibold text-opseu-dark">{t("tools.title")}</p>
          <p className="mt-2 text-gray-700">{t("tools.description")}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
            {(t.raw("tools.items") as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Callout>
      </section>
    </GuideLayout>
  );
}
