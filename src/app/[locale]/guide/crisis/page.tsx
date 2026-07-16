import { setRequestLocale, getTranslations } from "next-intl/server";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";

const scenarioKeys = ["strike", "bargaining", "layoffs", "management"] as const;

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
      <div className="space-y-8">
        {scenarioKeys.map((key) => (
          <section
            key={key}
            className="border-l-2 border-opseu-blue/30 pl-5"
          >
            <h2 className="text-xl font-bold text-opseu-dark">
              {t(`scenarios.${key}.title`)}
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
              {(t.raw(`scenarios.${key}.items`) as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        <section className="border-l-2 border-opseu-blue/30 pl-5">
          <h2 className="text-xl font-bold text-opseu-dark">
            {t("escalation.title")}
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            {(t.raw("escalation.items") as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <Callout>
          <p className="font-semibold text-opseu-dark">{t("tools.title")}</p>
          <p className="mt-2 text-gray-700">{t("tools.description")}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
            {(t.raw("tools.items") as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Callout>
      </div>
    </GuideLayout>
  );
}
