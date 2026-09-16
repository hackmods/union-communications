import type { Metadata } from "next";
import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";
import { PUBLIC_PAGE_TITLE_CLASS } from "@/lib/constants/public-type";

const richMarks = {
  strong: (chunks: ReactNode) => (
    <strong className="font-semibold text-opseu-dark">{chunks}</strong>
  ),
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === "fr"
      ? "Installer UnionOps comme appli"
      : "Install UnionOps as an app";
  const description =
    locale === "fr"
      ? "Comment ajouter UnionOps à l’écran d’accueil de votre iPhone, Android ou ordinateur — sans magasin d’applications."
      : "How to add UnionOps to your iPhone, Android, or computer home screen — no app store, and no extra download.";
  return buildPageMetadata({
    locale,
    path: "/install",
    title,
    description,
  });
}

type InstallStep = {
  /** next-intl rich markup key (e.g. `iosStep1`). */
  bodyKey: string;
};

type InstallSection = {
  id: string;
  iconPath: string;
  steps: InstallStep[];
};

const SECTIONS: ReadonlyArray<InstallSection> = [
  {
    id: "install-ios-heading",
    iconPath:
      "M16 4h-6a4 4 0 00-4 4v8a4 4 0 004 4h6M9 16h2",
    steps: [{ bodyKey: "iosStep1" }, { bodyKey: "iosStep2" }, { bodyKey: "iosStep3" }],
  },
  {
    id: "install-android-heading",
    iconPath:
      "M3 8h18v8H3zM7 16v3M17 16v3M8 4l1 4M16 4l-1 4M11 12h.01",
    steps: [
      { bodyKey: "androidStep1" },
      { bodyKey: "androidStep2" },
      { bodyKey: "androidStep3" },
    ],
  },
  {
    id: "install-desktop-heading",
    iconPath:
      "M3 5h18v10H3zM8 19h8M12 15v4M9 9h6",
    steps: [
      { bodyKey: "desktopStep1" },
      { bodyKey: "desktopStep2" },
      { bodyKey: "desktopStep3" },
    ],
  },
];

export default async function InstallPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("installPage");

  return (
    <PageShell size="focus" className="py-10 md:py-14" as="article">
      <header className="max-w-prose">
        <Eyebrow tone="brand">{t("title")}</Eyebrow>
        <h1 className={`${PUBLIC_PAGE_TITLE_CLASS} mt-2`}>{t("title")}</h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-700">
          {t("intro")}
        </p>
      </header>

      <section className="mt-12">
        <SectionHeading
          eyebrow={t("whyTitle")}
          title={t("whyTitle")}
        />
        <ul className="mt-6 grid list-none gap-4 p-0 sm:grid-cols-3">
          <li className="min-w-0">
            <Card className="flex h-full min-w-0 flex-col gap-2 sm:p-5">
              <h3 className="text-base font-bold text-opseu-dark">
                {t("whyHome")}
              </h3>
            </Card>
          </li>
          <li className="min-w-0">
            <Card className="flex h-full min-w-0 flex-col gap-2 sm:p-5">
              <h3 className="text-base font-bold text-opseu-dark">
                {t("whyOffline")}
              </h3>
            </Card>
          </li>
          <li className="min-w-0">
            <Card className="flex h-full min-w-0 flex-col gap-2 sm:p-5">
              <h3 className="text-base font-bold text-opseu-dark">
                {t("whyStore")}
              </h3>
            </Card>
          </li>
        </ul>
      </section>

      <div className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section, idx) => (
          <Card key={section.id} className="flex h-full min-w-0 flex-col gap-4 sm:p-6">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-opseu-blue/10 text-opseu-blue"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d={section.iconPath} />
                </svg>
              </span>
              <h2
                id={section.id}
                className="text-lg font-bold text-opseu-dark"
              >
                {idx === 0 ? t("iosTitle") : idx === 1 ? t("androidTitle") : t("desktopTitle")}
              </h2>
            </div>
            <ol className="flex flex-col gap-3">
              {section.steps.map((step, i) => (
                <li
                  key={step.bodyKey}
                  className="flex min-w-0 items-start gap-3 text-sm leading-relaxed text-slate-700"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-opseu-blue/10 text-xs font-bold text-opseu-blue"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    {t.rich(step.bodyKey, richMarks)}
                  </span>
                </li>
              ))}
            </ol>
            {idx === 2 && section.id === "install-desktop-heading" ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t.rich("desktopSafari", richMarks)}
              </p>
            ) : null}
          </Card>
        ))}
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Callout tone="brand">
          <p className="font-semibold text-opseu-dark">{t("privacyTitle")}</p>
          <p className="mt-2 text-base text-slate-700">{t("privacyBody")}</p>
        </Callout>
        <Callout tone="warning">
          <p className="font-semibold text-opseu-dark">{t("troubleTitle")}</p>
          <p className="mt-2 text-base text-slate-700">{t("troubleBody")}</p>
        </Callout>
      </div>

      <section className="mt-12">
        <SectionHeading
          eyebrow={t("limitsTitle")}
          title={t("limitsTitle")}
          intro={t("limitsNetwork")}
        />
      </section>

      <Card variant="ghost" className="mt-12 flex flex-col gap-4 sm:p-6">
        <p className="max-w-2xl text-base leading-relaxed text-slate-700">
          {t("relatedLead")}{" "}
          <Link
            href="/privacy"
            className="font-semibold text-opseu-blue underline-offset-2 hover:underline"
          >
            {t("relatedPrivacy")}
          </Link>
          {t("relatedMid")}{" "}
          <Link
            href="/support"
            className="font-semibold text-opseu-blue underline-offset-2 hover:underline"
          >
            {t("relatedSupport")}
          </Link>
          {t("relatedEnd")}
        </p>
        <div>
          <ButtonLink href="/" variant="ghost" trailingArrow>
            {t("backHome")}
          </ButtonLink>
        </div>
      </Card>
    </PageShell>
  );
}
