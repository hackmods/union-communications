import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";

const sectionKeys = ["when", "comms", "hub", "lists", "checklist"] as const;

export default async function EmailBroadcastGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("emailBroadcastGuide");
  const nav = await getTranslations("nav");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      relatedLinks={[
        { href: "/guide/print", label: nav("printGuide") },
        { href: "/guide/website", label: nav("websiteGuide") },
        { href: "/guide/social-media-plan", label: nav("socialMediaPlan") },
        { href: "/tools/document-generator", label: nav("documentGenerator") },
        { href: "/guide/crisis", label: nav("strikeGuide") },
      ]}
      relatedLabel={t("relatedLabel")}
      footer={
        <SourcesBlock
          pageId="emailBroadcast"
          title={ts("title")}
          intro={ts("intro")}
        />
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
        <Link href="/tools/document-generator">
          <Button variant="outline">{nav("documentGenerator")}</Button>
        </Link>
        <Link href="/tools/board-notice">
          <Button variant="outline">{nav("boardNotice")}</Button>
        </Link>
      </div>
    </GuideLayout>
  );
}
