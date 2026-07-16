import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";

const sectionKeys = ["why", "pages", "deploy", "domain"] as const;

export default async function WebsiteGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("websiteGuide");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <SourcesBlock pageId="website" title={ts("title")} intro={ts("intro")} />
      }
    >
      <div className="space-y-8">
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
          </section>
        ))}
      </div>

      <div className="mt-8">
        <Link href="/tools/website-template">
          <Button>{t("toolCta")}</Button>
        </Link>
      </div>
    </GuideLayout>
  );
}
