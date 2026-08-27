import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/guide/steward-playbooks", params);
}

const playbookLinks = [
  { href: "/guide/steward-101", key: "steward101" as const },
  { href: "/guide/officer-learning", key: "officerLearning" as const, featured: true },
  { href: "/guide/grievance-process", key: "grievance" as const },
  { href: "/guide/dfr", key: "dfr" as const },
  { href: "/guide/workplace-mapping", key: "workplaceMapping" as const },
  { href: "/guide/membership-signup", key: "membershipSignup" as const },
  { href: "/guide/right-to-refuse", key: "rightToRefuse" as const },
  { href: "/guide/seniority-bumping", key: "seniority" as const },
  { href: "/guide/joint-committee", key: "jointCommittee" as const },
] as const;

export default async function StewardPlaybooksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("stewardPlaybooksHub");

  return (
    <GuideLayout title={t("title")} subtitle={t("subtitle")} intro={t("intro")}>
      <Callout className="mb-8 max-w-3xl">
        <p className="font-semibold text-opseu-dark">{t("trainingPath.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("trainingPath.body")}</p>
        <div className="button-row mt-4">
          <Link href="/guide/steward-101">
            <Button size="sm">{t("trainingPath.steward101Cta")}</Button>
          </Link>
          <Link href="/guide/officer-learning">
            <Button size="sm" variant="outline">
              {t("trainingPath.officerLearningCta")}
            </Button>
          </Link>
        </div>
      </Callout>

      <Callout tone="muted" className="mb-8 max-w-3xl">
        <p className="font-semibold text-opseu-dark">{t("quizCallout.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">{t("quizCallout.body")}</p>
      </Callout>

      <section className="border-l-2 border-opseu-blue/30 pl-5">
        <h2 className="text-xl font-bold text-opseu-dark">{t("playbooks.title")}</h2>
        <p className="mt-2 max-w-prose text-gray-700">{t("playbooks.intro")}</p>
        <ul className="mt-4 space-y-4">
          {playbookLinks.map(({ href, key, ...rest }) => (
            <li
              key={href}
              className={
                "featured" in rest && rest.featured
                  ? "rounded-xl border border-teal-200 bg-teal-50/60 p-4"
                  : undefined
              }
            >
              <Link href={href} className="font-medium text-opseu-blue underline">
                {t(`links.${key}`)}
              </Link>
              {"featured" in rest && rest.featured ? (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-teal-800">
                  {t("quizBadge")}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-gray-600">{t(`blurbs.${key}`)}</p>
            </li>
          ))}
        </ul>
      </section>
    </GuideLayout>
  );
}
