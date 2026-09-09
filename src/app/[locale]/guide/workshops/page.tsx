import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  GuideLayout,
  GuideCatalogCard,
} from "@/components/comms/guide-ui";
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
          <GuideCatalogCard
            key={key}
            title={t(`outlines.${key}.title`)}
            body={t(`outlines.${key}.body`)}
            meta={t(`outlines.${key}.time`)}
            action={
              <Link href={OUTLINE_HREF[key]} className={guideCtaOutlineClass}>
                {t(`outlines.${key}.cta`)}
              </Link>
            }
          />
        ))}
      </ul>
    </GuideLayout>
  );
}
