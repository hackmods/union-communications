import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";

const sectionKeys = ["when", "flyers", "boards", "digital"] as const;

export default async function PrintGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("printGuide");
  const nav = await getTranslations("nav");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <SourcesBlock pageId="print" title={ts("title")} intro={ts("intro")} />
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

      <div className="button-row mt-8 max-w-lg">
        <Link href="/tools/flyer-maker">
          <Button variant="outline">{nav("flyerMaker")}</Button>
        </Link>
        <Link href="/tools/board-notice">
          <Button variant="outline">{nav("boardNotice")}</Button>
        </Link>
      </div>
    </GuideLayout>
  );
}
