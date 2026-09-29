import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { isPostgresConfigured } from "@/lib/db/client";
import { listUnionsForSiteAdmin } from "@/lib/site-admin/union-lifecycle";
import { LocalsUnionsTable } from "@/components/site-admin/LocalsUnionsTable";

export const dynamic = "force-dynamic";

export default async function SiteAdminLocalsIndexPage({
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

  let rows: Awaited<ReturnType<typeof listUnionsForSiteAdmin>> = [];
  const postgres = isPostgresConfigured();

  if (postgres) {
    try {
      rows = await listUnionsForSiteAdmin();
      await auditLog.log({
        userId: gate.session.user.id,
        action: "site_admin.local.list",
        resourceType: "site_admin",
        resourceId: "locals.index",
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
      <h1 className="mt-4 text-2xl font-bold text-opseu-dark lg:text-3xl">
        {t("localsIndexTitle")}
      </h1>
      <p className="mt-1 text-sm text-opseu-gray-dark">
        {t("localsIndexBody")}
      </p>

      <div className="mt-6">
        {!postgres ? (
          <p className="rounded-md border border-opseu-gray/15 bg-opseu-gray/5 px-3 py-4 text-sm text-opseu-gray-dark">
            {t("unionsNeedsPostgres")}
          </p>
        ) : (
          <LocalsUnionsTable rows={rows} />
        )}
      </div>
    </main>
  );
}
