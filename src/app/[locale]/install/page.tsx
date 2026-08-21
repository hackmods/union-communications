import type { Metadata } from "next";
import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Callout } from "@/components/ui/Callout";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

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

export default async function InstallPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("installPage");

  return (
    <PageShell size="focus" className="py-8 md:py-12" as="article">
      <h1 className="text-2xl font-bold leading-tight text-opseu-dark md:text-4xl">
        {t("title")}
      </h1>

      <div className="mt-8 max-w-prose space-y-8 text-lg leading-relaxed text-gray-800">
        <p>{t("intro")}</p>

        <section aria-labelledby="install-why-heading">
          <h2
            id="install-why-heading"
            className="text-xl font-bold text-opseu-dark"
          >
            {t("whyTitle")}
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-base text-gray-800">
            <li>{t("whyHome")}</li>
            <li>{t("whyOffline")}</li>
            <li>{t("whyStore")}</li>
          </ul>
        </section>

        <section aria-labelledby="install-ios-heading">
          <h2
            id="install-ios-heading"
            className="text-xl font-bold text-opseu-dark"
          >
            {t("iosTitle")}
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-6 text-base text-gray-800">
            <li>{t.rich("iosStep1", richMarks)}</li>
            <li>{t.rich("iosStep2", richMarks)}</li>
            <li>{t.rich("iosStep3", richMarks)}</li>
          </ol>
        </section>

        <section aria-labelledby="install-android-heading">
          <h2
            id="install-android-heading"
            className="text-xl font-bold text-opseu-dark"
          >
            {t("androidTitle")}
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-6 text-base text-gray-800">
            <li>{t.rich("androidStep1", richMarks)}</li>
            <li>{t.rich("androidStep2", richMarks)}</li>
            <li>{t.rich("androidStep3", richMarks)}</li>
          </ol>
        </section>

        <section aria-labelledby="install-desktop-heading">
          <h2
            id="install-desktop-heading"
            className="text-xl font-bold text-opseu-dark"
          >
            {t("desktopTitle")}
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-6 text-base text-gray-800">
            <li>{t.rich("desktopStep1", richMarks)}</li>
            <li>{t.rich("desktopStep2", richMarks)}</li>
            <li>{t.rich("desktopStep3", richMarks)}</li>
          </ol>
          <p className="mt-3 text-base text-gray-800">
            {t.rich("desktopSafari", richMarks)}
          </p>
        </section>

        <Callout tone="brand">
          <p className="font-semibold text-opseu-dark">{t("privacyTitle")}</p>
          <p className="mt-2 text-base text-gray-700">{t("privacyBody")}</p>
          <p className="mt-3 font-semibold text-opseu-dark">{t("troubleTitle")}</p>
          <p className="mt-2 text-base text-gray-700">{t("troubleBody")}</p>
        </Callout>

        <section aria-labelledby="install-limits-heading">
          <h2
            id="install-limits-heading"
            className="text-xl font-bold text-opseu-dark"
          >
            {t("limitsTitle")}
          </h2>
          <p className="mt-3 text-base text-gray-800">{t("limitsNetwork")}</p>
        </section>
      </div>

      <p className="mt-10 max-w-prose text-base text-gray-600">
        {t("relatedLead")}{" "}
        <Link href="/privacy" className="font-semibold text-opseu-blue hover:underline">
          {t("relatedPrivacy")}
        </Link>
        {t("relatedMid")}{" "}
        <Link href="/support" className="font-semibold text-opseu-blue hover:underline">
          {t("relatedSupport")}
        </Link>
        {t("relatedEnd")}
      </p>

      <p className="mt-12">
        <Link href="/" className="font-semibold text-opseu-blue hover:underline">
          {t("backHome")}
        </Link>
      </p>
    </PageShell>
  );
}
