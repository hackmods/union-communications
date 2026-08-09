import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { WorkshopDemoPath } from "@/components/comms/WorkshopDemoPath";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/workshop", params);
}

export default async function WorkshopGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("workshopGuide");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLabel={t("resourcesCta")}
      relatedLinks={[
        { href: "/guide/resources", label: t("resourcesCta") },
        { href: "/guide/social-media-plan", label: t("roadmapCta") },
        { href: "/tools", label: t("toolsCta") },
      ]}
    >
      <Callout className="mb-8">
        <h2 className="text-lg font-bold text-opseu-dark">{t("outlineTitle")}</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-gray-700">
          {(t.raw("outline") as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </Callout>

      <section className="mb-10 border-l-2 border-opseu-blue/30 pl-5">
        <h2 className="text-xl font-bold text-opseu-dark">{t("demoTitle")}</h2>
        <div className="mt-4">
          <WorkshopDemoPath showRoadmapLink />
        </div>
      </section>

      <div className="button-row max-w-xl">
        <Link href="/guide/resources">
          <Button size="sm">{t("resourcesCta")}</Button>
        </Link>
        <Link href="/guide/social-media-plan">
          <Button variant="outline" size="sm">
            {t("roadmapCta")}
          </Button>
        </Link>
        <Link href="/tools">
          <Button variant="ghost" size="sm">
            {t("toolsCta")}
          </Button>
        </Link>
      </div>
    </GuideLayout>
  );
}
