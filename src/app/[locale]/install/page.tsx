import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Callout } from "@/components/ui/Callout";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === "fr"
      ? "Installer UnionOps sur le bureau"
      : "Install UnionOps on your desktop";
  const description =
    locale === "fr"
      ? "Comment installer UnionOps comme application web sur votre ordinateur ou téléphone — sans magasin d'applications."
      : "How to install UnionOps as a web app on your computer or phone — no app store required.";
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

      <div className="mt-8 max-w-prose space-y-6 text-lg leading-relaxed text-gray-800">
        <p>{t("intro")}</p>

        <Callout tone="muted">
          <p className="font-semibold text-opseu-dark">{t("whereTitle")}</p>
          <p className="mt-2 text-base text-gray-700">{t("whereBody")}</p>
        </Callout>

        <section>
          <h2 className="text-xl font-bold text-opseu-dark">{t("chromeTitle")}</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-6 text-base text-gray-800">
            <li>{t("chromeStep1")}</li>
            <li>{t("chromeStep2")}</li>
            <li>{t("chromeStep3")}</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-bold text-opseu-dark">{t("androidTitle")}</h2>
          <p className="mt-3 text-base text-gray-800">{t("androidBody")}</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-opseu-dark">{t("safariTitle")}</h2>
          <p className="mt-3 text-base text-gray-800">{t("safariBody")}</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-opseu-dark">{t("limitsTitle")}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-base text-gray-800">
            <li>{t("limitsOffline")}</li>
            <li>{t("limitsNetwork")}</li>
            <li>{t("limitsBrand")}</li>
            <li>{t("limitsNoStore")}</li>
          </ul>
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
