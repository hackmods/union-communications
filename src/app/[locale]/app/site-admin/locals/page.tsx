import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { eq, isNull, sql } from "drizzle-orm";
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
            sql`${eq(locals.unionId, u.unionId)} AND ${isNull(locals.archivedAt)}`,
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
        Locals — pick a union
      </h1>
      <p className="mt-1 text-sm text-opseu-gray-dark">
        Each row drills into the union&rsquo;s locals. Archived locals remain
        in the database for compliance but are hidden from active rosters.
      </p>

      <div className="mt-6 overflow-x-auto rounded-md border border-opseu-gray/15 bg-white">
        <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
          <thead className="bg-opseu-gray/5 text-left text-xs uppercase text-opseu-gray-dark">
            <tr>
              <th className="px-3 py-2">Union</th>
              <th className="px-3 py-2 text-right">Locals</th>
              <th className="px-3 py-2 text-right">Active</th>
              <th className="px-3 py-2">Demo</th>
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
                      demo
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
                    Open
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
