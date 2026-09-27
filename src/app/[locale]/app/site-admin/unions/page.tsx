import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { isPostgresConfigured } from "@/lib/db/client";
import { listUnionsForSiteAdmin } from "@/lib/site-admin/union-lifecycle";
import { UnionLifecycleActions } from "@/components/site-admin/UnionLifecycleActions";

export const dynamic = "force-dynamic";

export default async function SiteAdminUnionsPage({
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
        action: "site_admin.union.list",
        resourceType: "site_admin",
        resourceId: "unions.index",
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
          {t("unionsIndexTitle")}
        </h1>
        <p className="mt-1 text-sm text-opseu-gray-dark">
          {t("unionsIndexBody")}
        </p>
      </header>

      {!postgres ? (
        <p className="rounded-md border border-opseu-gray/15 bg-opseu-gray/5 px-3 py-4 text-sm text-opseu-gray-dark">
          {t("unionsNeedsPostgres")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-opseu-gray/15 bg-white">
          <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
            <thead className="bg-opseu-gray/5 text-left text-xs uppercase text-opseu-gray-dark">
              <tr>
                <th className="px-3 py-2">{t("unionsColName")}</th>
                <th className="px-3 py-2">{t("unionsColSlug")}</th>
                <th className="px-3 py-2 text-right">{t("unionsColLocals")}</th>
                <th className="px-3 py-2 text-right">{t("unionsColUsers")}</th>
                <th className="px-3 py-2">{t("unionsColStatus")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-opseu-gray/10">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-sm text-opseu-gray-dark"
                  >
                    <p className="font-semibold text-opseu-dark">
                      {t("unionsEmptyTitle")}
                    </p>
                    <p className="mt-1">{t("unionsEmptyBody")}</p>
                    <p className="mt-3">
                      <Link
                        href="/app/onboarding"
                        className="font-semibold text-opseu-blue underline underline-offset-2"
                      >
                        {t("unionsEmptyCta")}
                      </Link>
                    </p>
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-opseu-dark">
                      {row.name}
                    </div>
                    <div className="font-mono text-xs text-opseu-gray-dark">
                      {row.id}
                    </div>
                    {row.isDemo ? (
                      <span className="mt-1 inline-block rounded bg-opseu-orange/20 px-2 py-0.5 text-xs text-opseu-orange-dark">
                        {t("usersDemoBadge")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.slug}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {row.activeLocalCount}/{row.localCount}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {row.userCount}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.archivedAt ? (
                      <span className="rounded bg-opseu-gray/15 px-2 py-0.5 text-opseu-gray-dark">
                        {t("unionsStatusArchived")}
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800">
                        {t("unionsStatusActive")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <UnionLifecycleActions
                      unionId={row.id}
                      slug={row.slug}
                      name={row.name}
                      archived={Boolean(row.archivedAt)}
                      empty={row.empty}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
