import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { redirectUnlessSiteAdmin, requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { isPostgresConfigured } from "@/lib/db/client";
import { isDemoPurgeEnabled } from "@/lib/features/demo-purge";
import { listUnionsForSiteAdmin } from "@/lib/site-admin/union-lifecycle";
import { UnionsAdminTable } from "@/components/site-admin/UnionsAdminTable";

export const dynamic = "force-dynamic";

/**
 * Site Admin → Organization structure
 * Canonical union inventory (merged former Unions + Locals index).
 */
export default async function SiteAdminOrganizationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  const gate = await requireSiteAdminSession();
  redirectUnlessSiteAdmin(locale, gate, "/app/site-admin/organization");
  const t = await getTranslations({ locale, namespace: "hub.platformOperator" });

  let rows: Awaited<ReturnType<typeof listUnionsForSiteAdmin>> = [];
  const postgres = isPostgresConfigured();
  const demoPurgeOn = isDemoPurgeEnabled();

  if (postgres) {
    try {
      rows = await listUnionsForSiteAdmin();
      await auditLog.log({
        userId: gate.session.user.id,
        action: "site_admin.organization.list",
        resourceType: "site_admin",
        resourceId: "organization.index",
        metadata: { unionCount: String(rows.length) },
      });
    } catch {
      rows = [];
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
      <p className="text-sm">
        <Link
          href="/app/site-admin"
          className="font-medium text-opseu-blue underline underline-offset-2"
        >
          ← {t("siteAdmin")}
        </Link>
      </p>
      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
          {t("organizationIndexTitle")}
        </h1>
        <p className="mt-1 text-sm text-opseu-gray-dark">
          {t("organizationIndexBody")}
        </p>
      </header>

      {!postgres ? (
        <p className="rounded-md border border-opseu-gray/15 bg-opseu-gray/5 px-3 py-4 text-sm text-opseu-gray-dark">
          {t("unionsNeedsPostgres")}
        </p>
      ) : (
        <UnionsAdminTable rows={rows} demoPurgeOn={demoPurgeOn} />
      )}
    </main>
  );
}
