import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { getDb } from "@/lib/db/client";
import { locals, unions } from "@/lib/db/schema/tenant";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";

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

  let buckets: Array<{
    unionId: string;
    unionName: string;
    unionSlug: string;
    isDemo: boolean;
    localCount: number;
    activeCount: number;
  }> = [];

  try {
    const db = getDb();
    const rows = await db
      .select({
        unionId: unions.id,
        unionName: unions.name,
        unionSlug: unions.slug,
        isDemo: unions.isDemo,
      })
      .from(unions)
      .orderBy(unions.name);

    buckets = await Promise.all(
      rows.map(async (u) => {
        const totalRow = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(locals)
          .where(eq(locals.unionId, u.unionId));
        const activeRow = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(locals)
          .where(
            and(eq(locals.unionId, u.unionId), isNull(locals.archivedAt)),
          );
        return {
          ...u,
          localCount: totalRow[0]?.n ?? 0,
          activeCount: activeRow[0]?.n ?? 0,
        };
      }),
    );

    await auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.local.list",
      resourceType: "site_admin",
      resourceId: "locals.index",
      metadata: { unionCount: String(buckets.length) },
    });
  } catch {
    buckets = [];
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 lg:py-12">
      <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
        {t("localsIndexTitle")}
      </h1>
      <p className="mt-1 text-sm text-opseu-gray-dark">
        {t("localsIndexBody")}
      </p>

      <div className="mt-6 overflow-x-auto rounded-md border border-opseu-gray/15 bg-white">
        <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
          <thead className="bg-opseu-gray/5 text-left text-xs uppercase text-opseu-gray-dark">
            <tr>
              <th className="px-3 py-2">{t("localsColUnion")}</th>
              <th className="px-3 py-2 text-right">{t("localsColCount")}</th>
              <th className="px-3 py-2 text-right">{t("localsColActive")}</th>
              <th className="px-3 py-2">{t("localsColDemo")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-opseu-gray/10">
            {buckets.map((b) => (
              <tr key={b.unionId}>
                <td className="px-3 py-2 font-semibold text-opseu-dark">
                  {b.unionName}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {b.localCount}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {b.activeCount}
                </td>
                <td className="px-3 py-2 text-xs">
                  {b.isDemo ? (
                    <span className="rounded bg-opseu-orange/20 px-2 py-0.5 text-opseu-orange-dark">
                      {t("usersDemoBadge")}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/app/site-admin/locals/${encodeURIComponent(b.unionId)}`}
                    className="text-opseu-blue hover:underline"
                  >
                    {t("usersOpen")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
