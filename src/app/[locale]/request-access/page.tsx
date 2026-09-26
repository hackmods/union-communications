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
  return buildPublicPageMetadata("/request-access", params);
}

export default async function RequestAccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "requestAccessPage" });
  const session = await auth();
  const tenant = session?.user?.unionId
    ? getTenantContext(session.user.unionId, session.user.localId)
    : null;
  const signedIn = Boolean(session?.user);

  return (
    <ComposedPageLayout
      composition="hub"
      size="read"
      className="py-10 md:py-14"
    >
      <Link
        href="/join"
        className="text-sm font-semibold text-opseu-blue underline"
      >
        {t("back")}
      </Link>
      <h1 className="mt-5 text-4xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-4 max-w-prose text-lg leading-relaxed text-slate-700">
        {t("intro")}
      </p>
      <PublicHubPanel className="mt-8 p-5 sm:p-7">
        {signedIn ? (
          <AccessSharePanel
            variant="member_access"
            unionName={tenant?.union.name}
            localNumber={tenant?.local?.localNumber}
          />
        ) : (
          <AccessRequestForm kind="member_access" locale={locale} />
        )}
      </PublicHubPanel>
    </ComposedPageLayout>
  );
}
