import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { guideCtaOutlineClass } from "@/components/comms/guideCtaClasses";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/workshops", params);
}

const OUTLINE_KEYS = ["comms", "landAcknowledgement"] as const;

const OUTLINE_HREF = {
  comms: "/guide/workshop",
  landAcknowledgement: "/guide/workshops/land-acknowledgement",
} as const;

export default async function WorkshopsHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("workshopsHub");
  const nav = await getTranslations("nav");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/guide", label: nav("guide") },
        { href: "/guide/resources", label: nav("resources") },
        { href: "/guides", label: nav("allGuides") },
      ]}
    >
      <ul className="mt-2 space-y-6">
        {OUTLINE_KEYS.map((key) => (
          <li
            key={key}
            className="border-l-2 border-opseu-blue/30 pl-5"
          >
            <h2 className="text-lg font-bold text-opseu-dark md:text-xl">
              {t(`outlines.${key}.title`)}
            </h2>
            <p className="mt-2 max-w-prose leading-relaxed text-gray-700">
              {t(`outlines.${key}.body`)}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {t(`outlines.${key}.time`)}
            </p>
            <div className="button-row mt-4">
              <Link
                href={OUTLINE_HREF[key]}
                className={guideCtaOutlineClass}
              >
                {t(`outlines.${key}.cta`)}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </GuideLayout>
  );
}
