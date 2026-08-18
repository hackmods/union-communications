import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide", params);
}

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
  { href: "/guide/dfr", key: "dfr" as const },
  { href: "/guide/seniority-bumping", key: "seniority" as const },
  { href: "/guide/right-to-refuse", key: "rightToRefuse" as const },
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
      size="wide"
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
      <Callout className="mb-8 max-w-3xl">
        <p className="font-semibold text-opseu-dark">{crisis("title")}</p>
        <p className="mt-1">{crisis("subtitle")}</p>
        <Link
          href="/guide/crisis"
          className="mt-2 inline-block font-medium text-opseu-blue underline"
        >
          {nav("strikeGuide")} →
        </Link>
      </Callout>

      <ol className="grid gap-8 lg:grid-cols-2 xl:gap-10">
        {chapterKeys.map((key, i) => (
          <li key={key} className="border-l-2 border-opseu-blue/30 pl-5">
            <div className="flex items-baseline gap-3">
              <span
                className="text-sm font-bold tabular-nums text-opseu-blue"
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="text-xl font-bold text-opseu-dark">
                {t(`chapters.${key}.title`)}
              </h2>
            </div>
            <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
              {t(`chapters.${key}.content`)}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <Callout tone="muted">
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
                { href: "/guide/email-broadcast", key: "email" as const },
                { href: "/guide/short-form", key: "shortForm" as const },
                {
                  href: "/guide/membership-signup",
                  key: "membershipSignup" as const,
                },
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

        <Callout tone="muted">
          <p className="font-semibold text-opseu-dark">{t("labourGuides.title")}</p>
          <nav
            className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1"
            aria-label={t("labourGuides.title")}
          >
            {(
              [
                { href: "/guide/dfr", key: "dfr" as const },
                { href: "/guide/seniority-bumping", key: "seniority" as const },
                {
                  href: "/guide/right-to-refuse",
                  key: "rightToRefuse" as const,
                },
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
                  {t(`labourGuides.${link.key}`)}
                </Link>
              </span>
            ))}
          </nav>
        </Callout>
      </div>
    </GuideLayout>
  );
}
