import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";

const chapterKeys = [
  "platforms",
  "tone",
  "frequency",
  "trolls",
  "accessibility",
] as const;

const pathLinks = [
  { href: "/guide/social-media-plan", key: "plan" as const },
  { href: "/guide/resources", key: "resources" as const },
  { href: "/guide/crisis", key: "crisis" as const },
];

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guide");
  const nav = await getTranslations("nav");
  const crisis = await getTranslations("crisisGuide");
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLabel={t("path.title")}
      relatedLinks={pathLinks.map(({ href, key }) => ({
        href,
        label: t(`path.${key}`),
      }))}
      footer={
        <SourcesBlock pageId="blueprint" title={ts("title")} intro={ts("intro")} />
      }
    >
      <Callout className="mb-6">
        <p className="font-semibold text-opseu-dark">{crisis("title")}</p>
        <p className="mt-1">{crisis("subtitle")}</p>
        <Link
          href="/guide/crisis"
          className="mt-2 inline-block font-medium text-opseu-blue underline"
        >
          {nav("strikeGuide")} →
        </Link>
      </Callout>

      <div className="space-y-6">
        {chapterKeys.map((key, i) => (
          <Card key={key}>
            <CardTitle>
              {i + 1}. {t(`chapters.${key}.title`)}
            </CardTitle>
            <p className="mt-3 leading-relaxed text-gray-700">
              {t(`chapters.${key}.content`)}
            </p>
          </Card>
        ))}
      </div>

      <Callout tone="muted" className="mt-10">
        <p className="font-semibold text-opseu-dark">{t("channelGuides.title")}</p>
        <nav
          className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1"
          aria-label={t("channelGuides.title")}
        >
          {(
            [
              { href: "/guide/union-boards", key: "unionBoards" as const },
              { href: "/guide/print", key: "print" as const },
              { href: "/guide/website", key: "website" as const },
            ] as const
          ).map((link, i) => (
            <span key={link.href} className="inline-flex items-baseline gap-x-3">
              {i > 0 && (
                <span className="text-gray-300" aria-hidden="true">
                  ·
                </span>
              )}
              <Link
                href={link.href}
                className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
              >
                {t(`channelGuides.${link.key}`)}
              </Link>
            </span>
          ))}
        </nav>
      </Callout>
    </GuideLayout>
  );
}
