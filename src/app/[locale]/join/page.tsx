import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";
import { PublicHubPanel } from "@/components/comms/PublicHubPanel";
import { AccessRequestForm } from "@/components/access/AccessRequestForm";
import { AccessSharePanel } from "@/components/access/AccessSharePanel";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { getTenantContext } from "@/lib/tenant/loader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/join", params);
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "joinPage" });
  const session = await auth();
  const tenant = session?.user?.unionId
    ? getTenantContext(session.user.unionId, session.user.localId)
    : null;
  const signedIn = Boolean(session?.user);

  return (
    <ComposedPageLayout
      composition="hub"
      size="wide"
      className="py-10 md:py-14"
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <section className="order-2 lg:order-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-opseu-blue">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-4xl font-bold text-opseu-dark">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-prose text-lg leading-relaxed text-slate-700">
            {t("intro")}
          </p>
          {!signedIn ? (
            <p className="mt-4 lg:hidden">
              <a
                href="#access-request-form"
                className="text-sm font-semibold text-opseu-blue underline"
              >
                {t("skipToForm")}
              </a>
            </p>
          ) : null}
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <PublicHubPanel>
              <h2 className="font-semibold text-opseu-dark">{t("commsTitle")}</h2>
              <p className="mt-2 text-sm text-slate-700">{t("commsBody")}</p>
            </PublicHubPanel>
            <PublicHubPanel>
              <h2 className="font-semibold text-opseu-dark">{t("hubTitle")}</h2>
              <p className="mt-2 text-sm text-slate-700">{t("hubBody")}</p>
            </PublicHubPanel>
            <PublicHubPanel>
              <h2 className="font-semibold text-opseu-dark">
                {t("portalTitle")}
              </h2>
              <p className="mt-2 text-sm text-slate-700">{t("portalBody")}</p>
            </PublicHubPanel>
          </div>
          <p className="mt-6 text-sm text-slate-700">
            {t("memberPrompt")}{" "}
            <Link
              href="/request-access"
              className="font-semibold text-opseu-blue underline"
            >
              {t("memberLink")}
            </Link>
          </p>
          <p className="mt-3 text-sm text-slate-700">
            {t("loginPrompt")}{" "}
            <Link
              href="/app/login"
              className="font-semibold text-opseu-blue underline"
            >
              {t("loginLink")}
            </Link>
          </p>
        </section>
        <PublicHubPanel className="order-1 p-5 sm:p-7 lg:order-2">
          {signedIn ? (
            <AccessSharePanel
              variant="local_interest"
              unionName={tenant?.union.name}
              localNumber={tenant?.local?.localNumber}
            />
          ) : (
            <AccessRequestForm kind="local_interest" locale={locale} />
          )}
        </PublicHubPanel>
      </div>
    </ComposedPageLayout>
  );
}
