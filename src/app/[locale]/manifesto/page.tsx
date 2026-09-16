import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconChip } from "@/components/ui/IconChip";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";
import { PUBLIC_PAGE_TITLE_CLASS } from "@/lib/constants/public-type";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === "fr"
      ? "Bâti par solidarité, pas pour le profit"
      : "Built in solidarity, not for profit";
  const description =
    locale === "fr"
      ? "Les Comms restent gratuites sur votre appareil. Un Hub des dirigeants ou Portail local hébergé a un coût. L'auto-hébergement reste possible."
      : "Comms stay free on your device. Hosted Officer Hub or Local Portal has a hosting cost. Self-host stays an option.";
  return buildPageMetadata({
    locale,
    path: "/manifesto",
    title,
    description,
  });
}

type PromiseItem = {
  titleKey: "noSubsTitle" | "hostingTitle" | "noDataTitle" | "noAdsTitle";
  bodyKey: "noSubsBody" | "hostingBody" | "noDataBody" | "noAdsBody" | "noDataBodyCommsOnly";
  bodyHubConditional?: boolean;
  iconPath: string;
};

const PROMISES: ReadonlyArray<PromiseItem> = [
  {
    titleKey: "noSubsTitle",
    bodyKey: "noSubsBody",
    iconPath: "M5 13l4 4L19 7",
  },
  {
    titleKey: "hostingTitle",
    bodyKey: "hostingBody",
    iconPath:
      "M3 7h2a2 2 0 012 2v8a2 2 0 01-2 2H3M21 7h-2a2 2 0 00-2 2v8a2 2 0 002 2h2M7 11h10",
  },
  {
    titleKey: "noDataTitle",
    bodyKey: "noDataBody",
    bodyHubConditional: true,
    iconPath: "M12 11V7a4 4 0 10-8 0v4M5 11h14v10H5z",
  },
  {
    titleKey: "noAdsTitle",
    bodyKey: "noAdsBody",
    iconPath:
      "M3 3v18h18M7 14l4-4 4 4 5-5",
  },
];

export default async function ManifestoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("manifesto");
  const hubPublic = isOfficerHubPublic();

  return (
    <PageShell size="focus" className="py-10 md:py-14" as="article">
      <header className="max-w-prose">
        <Eyebrow tone="brand">{t("title")}</Eyebrow>
        <h1 className={`${PUBLIC_PAGE_TITLE_CLASS} mt-2`}>{t("title")}</h1>
        <div className="mt-6 space-y-5 text-lg leading-relaxed text-slate-700">
          <p>{t("p1")}</p>
          <p>{t("p2")}</p>
        </div>
      </header>

      <section className="mt-12">
        <SectionHeading
          eyebrow={t("promiseLead")}
          title={t("promiseIntro")}
          intro={t("promiseIntro")}
        />
        <ul className="mt-8 grid list-none gap-5 p-0 sm:gap-6 md:grid-cols-2">
          {PROMISES.map((promise) => (
            <li key={promise.titleKey} className="min-w-0">
              <Card className="flex h-full min-w-0 flex-col gap-3 sm:p-6">
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
                    <path d={promise.iconPath} />
                  </svg>
                </IconChip>
                <h3 className="text-lg font-bold text-opseu-dark">
                  {t(promise.titleKey)}
                </h3>
                <p className="text-[0.95rem] leading-relaxed text-slate-600">
                  {t(
                    promise.bodyHubConditional && promise.bodyKey === "noDataBody"
                      ? hubPublic
                        ? "noDataBody"
                        : "noDataBodyCommsOnly"
                      : promise.bodyKey,
                  )}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 max-w-prose space-y-6 leading-relaxed text-slate-700">
        <p className="text-2xl font-bold text-opseu-blue">{t("slogan")}</p>
        <p>{t("closing")}</p>
      </div>

      <Card
        variant="ghost"
        className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <p className="max-w-xl text-base leading-relaxed text-slate-700">
          {t("supportLead")}{" "}
          <Link
            href="/support"
            className="font-semibold text-opseu-blue underline-offset-2 hover:underline"
          >
            {t("supportLink")}
          </Link>
        </p>
        <ButtonLink href="/support" variant="outline" size="sm">
          {t("supportLink")}
        </ButtonLink>
      </Card>

      <div className="mt-12">
        <ButtonLink href="/" variant="ghost" trailingArrow>
          {t("backHome")}
        </ButtonLink>
      </div>
    </PageShell>
  );
}
