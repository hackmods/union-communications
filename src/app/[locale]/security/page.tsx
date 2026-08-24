import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { Link } from "@/i18n/navigation";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/security", params);
}

export default async function SecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("securityPage");
  const hubPublic = isOfficerHubPublic();

  return (
    <GuideLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="space-y-8">
        <Callout>
          <p className="font-semibold text-opseu-dark">{t("leadTitle")}</p>
          <p className="mt-2 text-gray-700">{t("leadBody")}</p>
        </Callout>

        <section className="border-l-2 border-opseu-blue/30 pl-5">
          <h2 className="text-xl font-bold text-opseu-dark">{t("commsTitle")}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            <li>{t("comms1")}</li>
            <li>{t("comms2")}</li>
            <li>{t("comms3")}</li>
          </ul>
        </section>

        {hubPublic ? (
          <>
            <section className="border-l-2 border-opseu-blue/30 pl-5">
              <h2 className="text-xl font-bold text-opseu-dark">
                {t("transitTitle")}
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
                <li>{t("transit1")}</li>
                <li>{t("transit2")}</li>
                <li>{t("transit3")}</li>
              </ul>
            </section>

            <section className="border-l-2 border-opseu-blue/30 pl-5">
              <h2 className="text-xl font-bold text-opseu-dark">{t("hubTitle")}</h2>
              <p className="mt-3 max-w-prose text-gray-700">{t("hubIntro")}</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
                <li>{t("hub1")}</li>
                <li>{t("hub2")}</li>
                <li>{t("hub3")}</li>
                <li>{t("hub4")}</li>
                <li>{t("hub5")}</li>
              </ul>
            </section>

            <section className="border-l-2 border-opseu-blue/30 pl-5">
              <h2 className="text-xl font-bold text-opseu-dark">
                {t("portalTitle")}
              </h2>
              <p className="mt-3 max-w-prose text-gray-700">{t("portalIntro")}</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
                <li>{t("portal1")}</li>
                <li>{t("portal2")}</li>
                <li>{t("portal3")}</li>
                <li>{t("portal4")}</li>
              </ul>
            </section>

            <Callout tone="muted">
              <p className="font-semibold text-opseu-dark">{t("honestTitle")}</p>
              <p className="mt-2 text-gray-700">{t("honestBody")}</p>
            </Callout>

            <section className="border-l-2 border-opseu-blue/30 pl-5">
              <h2 className="text-xl font-bold text-opseu-dark">
                {t("operatorTitle")}
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
                <li>{t("operator1")}</li>
                <li>{t("operator2")}</li>
                <li>{t("operator3")}</li>
                <li>{t("operator4")}</li>
              </ul>
            </section>
          </>
        ) : null}

        <Callout tone="plain">
          <p className="font-semibold text-opseu-dark">{t("reportTitle")}</p>
          <p className="mt-2 text-gray-700">
            {t("reportBody")}{" "}
            <Link href="/support" className="text-opseu-blue underline">
              {t("supportLink")}
            </Link>
            .
          </p>
        </Callout>

        <Callout tone="plain">
          <p className="font-semibold text-opseu-dark">{t("privacyTitle")}</p>
          <p className="mt-2 text-gray-700">
            {t("privacyBody")}{" "}
            <Link href="/privacy" className="text-opseu-blue underline">
              {t("privacyLink")}
            </Link>
            .
          </p>
        </Callout>
      </div>
    </GuideLayout>
  );
}
