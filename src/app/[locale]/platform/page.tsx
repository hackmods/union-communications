import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";
import { PublicHubPanel } from "@/components/comms/PublicHubPanel";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/platform", params);
}

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platformPage");
  const hubAdvertised = isOfficerHubPublic();

  return (
    <ComposedPageLayout composition="hub" size="wide" className="py-10 md:py-14">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-opseu-blue">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-4xl font-bold text-opseu-dark">{t("title")}</h1>
        <p className="mt-5 max-w-prose text-lg leading-relaxed text-slate-700">
          {t("intro")}
        </p>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-slate-700">
          {t("brandBridge")}
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <PublicHubPanel className="p-5 sm:p-7">
          <h2 className="text-xl font-bold text-opseu-dark">{t("hubTitle")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">{t("hubBody")}</p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
            <li>{t("hubItemCasework")}</li>
            <li>{t("hubItemMeetings")}</li>
            <li>{t("hubItemOrg")}</li>
            <li>{t("hubItemTime")}</li>
          </ul>
          {hubAdvertised ? (
            <ButtonLink href="/app" className="mt-6">
              {t("hubCta")}
            </ButtonLink>
          ) : (
            <ButtonLink href="/join" className="mt-6">
              {t("requestAccessCta")}
            </ButtonLink>
          )}
        </PublicHubPanel>

        <PublicHubPanel className="p-5 sm:p-7">
          <h2 className="text-xl font-bold text-opseu-dark">{t("portalTitle")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">{t("portalBody")}</p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
            <li>{t("portalItemCircles")}</li>
            <li>{t("portalItemParticipation")}</li>
            <li>{t("portalItemMemberSafe")}</li>
          </ul>
          <ButtonLink href="/join" variant="outline" className="mt-6">
            {t("portalCta")}
          </ButtonLink>
        </PublicHubPanel>
      </div>

      <p className="mt-10 max-w-prose text-sm leading-relaxed text-slate-700">
        {t("joinPrompt")}{" "}
        <Link href="/join" className="font-semibold text-opseu-blue underline underline-offset-2">
          {t("joinLink")}
        </Link>
        {" · "}
        <Link
          href="/request-access"
          className="font-semibold text-opseu-blue underline underline-offset-2"
        >
          {t("memberAccessLink")}
        </Link>
      </p>
    </ComposedPageLayout>
  );
}
