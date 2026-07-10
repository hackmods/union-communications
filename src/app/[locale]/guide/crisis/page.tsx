import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardTitle } from "@/components/ui/Card";

const scenarioKeys = ["strike", "bargaining", "layoffs", "management"] as const;

export default async function CrisisPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("crisisGuide");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-opseu-blue">
        <a href={`/${locale}/guide/`} className="underline">
          {t("backToGuide")}
        </a>
      </p>

      <h1 className="mt-4 text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-2 text-lg text-gray-600">{t("subtitle")}</p>
      <p className="mt-4 leading-relaxed text-gray-700">{t("intro")}</p>

      <div className="mt-10 space-y-6">
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
    </div>
  );
}
