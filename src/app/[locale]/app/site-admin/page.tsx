import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { isDemoPurgeEnabled } from "@/lib/features/demo-purge";
import { SiteAdminCard } from "@/components/site-admin/SiteAdminCard";

export const dynamic = "force-dynamic";

export default async function SiteAdminLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    if (gate.status === 403) redirect(`/${locale}/app`);
    redirect(`/${locale}/app/login`);
  }

  const t = await getTranslations({ locale, namespace: "hub.platformOperator" });
  const demoPurgeOn = isDemoPurgeEnabled();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
          {t("siteAdminTitle")}
        </h1>
        <p className="mt-1 text-sm text-opseu-gray-dark">{t("siteAdminBody")}</p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SiteAdminCard
          href="/app/site-admin/account-support"
          title={t("accountSupport")}
          body={t("accountSupportBody")}
        />
        <SiteAdminCard
          href="/app/site-admin/users"
          title={t("users")}
          body={t("usersBody")}
        />
        <SiteAdminCard
          href="/app/site-admin/locals"
          title={t("locals")}
          body={t("localsBody")}
        />
        <SiteAdminCard
          href="/app/site-admin/membership-integrity"
          title={t("membershipIntegrity")}
          body={t("membershipIntegrityBody")}
        />
        {demoPurgeOn ? (
          <SiteAdminCard
            href="/app/site-admin/demo-cleanup"
            title={t("demoCleanup")}
            body={t("demoCleanupBody")}
            tone="warn"
          />
        ) : null}
        <SiteAdminCard
          href="/app/site-admin/public-tools"
          title={t("publicTools")}
          body={t("publicToolsCardBody")}
        />

        <SiteAdminCard
          href="/app/invites"
          title={t("invites")}
          body={t("siteAdminBody")}
        />
        <SiteAdminCard
          href="/app/feedback"
          title={t("feedback")}
          body={t("siteAdminBody")}
        />
        <SiteAdminCard
          href="/app/audit"
          title={t("audit")}
          body={t("siteAdminBody")}
        />
      </div>
    </main>
  );
}
