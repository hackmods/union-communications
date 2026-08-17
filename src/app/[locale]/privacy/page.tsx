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
  return buildPublicPageMetadata("/privacy", params);
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacyPage");
  const hubPublic = isOfficerHubPublic();

  return (
    <GuideLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="space-y-8">
        <Callout>
          <p className="font-semibold text-opseu-dark">
            {hubPublic ? t("leadTitleHub") : t("leadTitleCommsOnly")}
          </p>
          <p className="mt-2 text-gray-700">
            {hubPublic ? t("leadBodyHub") : t("leadBodyCommsOnly")}
          </p>
        </Callout>

        <section className="border-l-2 border-opseu-blue/30 pl-5">
          <h2 className="text-xl font-bold text-opseu-dark">{t("commsTitle")}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            <li>{t("comms1")}</li>
            <li>{t("comms2")}</li>
            <li>{t("comms3")}</li>
            <li>{t("comms4")}</li>
          </ul>
        </section>

        {hubPublic ? (
          <section className="border-l-2 border-opseu-blue/30 pl-5">
            <h2 className="text-xl font-bold text-opseu-dark">{t("hubTitle")}</h2>
            <p className="mt-3 max-w-prose text-gray-700">{t("hubIntro")}</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
              <li>{t("hubSelfHost")}</li>
              <li>{t("hubHybrid")}</li>
              <li>{t("hubDemo")}</li>
            </ul>
          </section>
        ) : null}

        <section className="border-l-2 border-opseu-blue/30 pl-5">
          <h2 className="text-xl font-bold text-opseu-dark">{t("ontarioTitle")}</h2>
          <p className="mt-3 max-w-prose text-gray-700">
            {hubPublic ? t("ontarioHub") : t("ontarioCommsOnly")}
          </p>
        </section>

        <Callout tone="muted">
          <p className="font-semibold text-opseu-dark">{t("responsibilitiesTitle")}</p>
          <p className="mt-2 text-gray-700">
            {t("responsibilitiesBody")}{" "}
            <Link href="/guide/photo-consent" className="text-opseu-blue underline">
              {t("photoConsentLink")}
            </Link>
            .
          </p>
        </Callout>

        <Callout tone="muted">
          <p className="font-semibold text-opseu-dark">{t("installTitle")}</p>
          <p className="mt-2 text-gray-700">
            {t("installBody")}{" "}
            <Link href="/install" className="text-opseu-blue underline">
              {t("installLink")}
            </Link>
            .
          </p>
        </Callout>

        <Callout tone="plain">
          <p className="font-semibold text-opseu-dark">{t("siteFeedbackTitle")}</p>
          <p className="mt-2 text-gray-700">
            {t("siteFeedbackBody")}{" "}
            <Link href="/feedback" className="text-opseu-blue underline">
              {t("siteFeedbackLink")}
            </Link>
            .
          </p>
        </Callout>

        <Callout tone="plain">
          <p className="font-semibold text-opseu-dark">{t("contactTitle")}</p>
          <p className="mt-2 text-gray-700">
            {t("contactBody")}{" "}
            <Link href="/support" className="text-opseu-blue underline">
              {t("supportLink")}
            </Link>
            .
          </p>
        </Callout>
      </div>
    </GuideLayout>
  );
}
