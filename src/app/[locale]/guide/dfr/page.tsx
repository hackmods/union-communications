import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";

const sectionKeys = [
  "whatItMeans",
  "legalTest",
  "failureModes",
  "practice",
] as const;

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
      <div className="space-y-8">
        <Callout>
          <p className="font-semibold text-opseu-dark">{t("disclaimer.title")}</p>
          <p className="mt-2 leading-relaxed text-gray-700">
            {t("disclaimer.body")}
          </p>
        </Callout>

        {sectionKeys.map((key) => (
          <section
            key={key}
            className="border-l-2 border-opseu-blue/30 pl-5"
          >
            <h2 className="text-xl font-bold text-opseu-dark">
              {t(`sections.${key}.title`)}
            </h2>
            <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
              {t(`sections.${key}.content`)}
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
              {(t.raw(`sections.${key}.items`) as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        <Callout tone="muted">
          <p className="font-semibold text-opseu-dark">{t("hub.title")}</p>
          <p className="mt-2 leading-relaxed text-gray-700">{t("hub.body")}</p>
        </Callout>
      </div>
    </GuideLayout>
  );
}
