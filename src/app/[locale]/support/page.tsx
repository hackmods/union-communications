import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  BUY_ME_A_COFFEE_URL,
  GITHUB_ISSUES_URL,
} from "@/lib/constants/support";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { IconChip } from "@/components/ui/IconChip";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";
import { PUBLIC_PAGE_TITLE_CLASS } from "@/lib/constants/public-type";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === "fr" ? "Soutenir UnionOps" : "Support UnionOps";
  const description =
    locale === "fr"
      ? "Les outils Comms restent gratuits. Un café optionnel aide le site public. Un Hub des dirigeants ou Portail local hébergé est un coût distinct."
      : "Comms tools stay free. Optional coffee tips help cover the public site. Hosted Officer Hub or Local Portal is a separate hosting cost.";
  return buildPageMetadata({
    locale,
    path: "/support",
    title,
    description,
  });
}

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("supportPage");

  return (
    <PageShell size="focus" className="py-10 md:py-14" as="article">
      <header className="max-w-prose">
        <Eyebrow tone="brand">{t("title")}</Eyebrow>
        <h1 className={`${PUBLIC_PAGE_TITLE_CLASS} mt-2`}>{t("title")}</h1>
        <div className="mt-6 space-y-5 text-lg leading-relaxed text-slate-700">
          <p>
            {t("p1Lead")}{" "}
            <Link
              href="/manifesto"
              className="font-semibold text-opseu-blue underline-offset-2 hover:underline"
            >
              {t("p1ManifestoLink")}
            </Link>
            {t("p1End")}
          </p>
          <p>{t("p2")}</p>
          <p>{t("p3")}</p>
        </div>
      </header>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <Card className="flex h-full min-w-0 flex-col gap-4 sm:p-6">
          <Eyebrow tone="amber">{t("cta")}</Eyebrow>
          <div className="flex items-start gap-3">
            <IconChip tone="brand">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="h-5 w-5"
              >
                <path d="M6 7h12v5a4 4 0 01-4 4h-4a4 4 0 01-4-4V7Z" />
                <path d="M9 7V5a3 3 0 116 0v2" />
                <path d="M10 16v3M14 16v3" />
              </svg>
            </IconChip>
          </div>
          <p className="text-[0.95rem] leading-relaxed text-slate-600">
            {t("ctaHint")}
          </p>
          <div className="mt-auto pt-2">
            <ButtonLink href={BUY_ME_A_COFFEE_URL} variant="primary" block>
              {t("cta")}
            </ButtonLink>
          </div>
        </Card>

        <Card variant="ghost" className="flex h-full min-w-0 flex-col gap-4 sm:p-6">
          <Eyebrow tone="brand">{t("contactTitle")}</Eyebrow>
          <p className="text-[0.95rem] leading-relaxed text-slate-700">
            {t("contactBody")}
          </p>
          <div className="mt-auto pt-2">
            <ButtonLink
              href={GITHUB_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              block
            >
              {t("contactCta")}
            </ButtonLink>
            <p className="mt-2 text-[0.8rem] text-slate-500">{t("contactHint")}</p>
          </div>
        </Card>

        <Card variant="ghost" className="flex h-full min-w-0 flex-col gap-4 md:col-span-2 sm:p-6">
          <Eyebrow tone="muted">{t("feedbackTitle")}</Eyebrow>
          <p className="text-[0.95rem] leading-relaxed text-slate-700">
            {t("feedbackBody")}
          </p>
          <div className="mt-auto pt-2">
            <ButtonLink href="/feedback" variant="outline" block>
              {t("feedbackCta")}
            </ButtonLink>
          </div>
        </Card>
      </section>

      <div className="mt-12">
        <ButtonLink href="/" variant="ghost" trailingArrow>
          {t("backHome")}
        </ButtonLink>
      </div>
    </PageShell>
  );
}
