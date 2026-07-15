import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardTitle } from "@/components/ui/Card";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";

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
      <div className="space-y-6">
        {scenarioKeys.map((key) => (
          <Card key={key}>
            <CardTitle>{t(`scenarios.${key}.title`)}</CardTitle>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
              {(t.raw(`scenarios.${key}.items`) as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}

        <Card>
          <CardTitle>{t("escalation.title")}</CardTitle>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            {(t.raw("escalation.items") as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>{t("tools.title")}</CardTitle>
          <p className="mt-3 text-gray-700">{t("tools.description")}</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            {(t.raw("tools.items") as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </div>
    </GuideLayout>
  );
}
