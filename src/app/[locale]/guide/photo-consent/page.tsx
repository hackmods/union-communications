import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";

const checklistKeys = [
  "consent",
  "public",
  "confidential",
  "group",
  "minors",
  "withdrawal",
] as const;

export default async function PhotoConsentGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("photoConsentGuide");
  const nav = await getTranslations("nav");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLinks={[{ href: "/guide", label: t("backToGuide") }]}
      footer={
        <SourcesBlock
          pageId="photoConsent"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <div className="space-y-8">
        <section className="border-l-2 border-opseu-blue/30 pl-5">
          <h2 className="text-xl font-bold text-opseu-dark">{t("why.title")}</h2>
          <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
            {t("why.content")}
          </p>
        </section>

        <section className="border-l-2 border-opseu-blue/30 pl-5">
          <h2 className="text-xl font-bold text-opseu-dark">
            {t("checklist.title")}
          </h2>
          <p className="mt-3 text-gray-700">{t("checklist.intro")}</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            {checklistKeys.map((key) => (
              <li key={key}>{t(`checklist.items.${key}`)}</li>
            ))}
          </ul>
        </section>

        <Callout>
          <p className="font-semibold text-opseu-dark">{t("toolbox.title")}</p>
          <p className="mt-2 leading-relaxed text-gray-700">
            {t("toolbox.content")}
          </p>
        </Callout>

        <Callout tone="muted">
          <p className="font-semibold text-opseu-dark">{t("workshop.title")}</p>
          <p className="mt-2 leading-relaxed text-gray-700">
            {t("workshop.content")}
          </p>
        </Callout>
      </div>

      <div className="button-row mt-8 max-w-lg">
        <Link href="/tools/graphic-maker">
          <Button variant="outline">{nav("graphicMaker")}</Button>
        </Link>
        <Link href="/privacy">
          <Button variant="outline">{nav("privacy")}</Button>
        </Link>
        <Link href="/guide/resources">
          <Button variant="outline">{nav("resources")}</Button>
        </Link>
      </div>
    </GuideLayout>
  );
}
