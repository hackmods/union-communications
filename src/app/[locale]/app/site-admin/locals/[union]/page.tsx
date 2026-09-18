import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { and, eq, type SQL } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { getDb } from "@/lib/db/client";
import { locals, unions } from "@/lib/db/schema/tenant";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";

export const dynamic = "force-dynamic";

export default async function SiteAdminUnionLocalsPage({
  params,
}: {
  params: Promise<{ locale: string; union: string }>;
}) {
  const { locale, union: unionId } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    if (gate.status === 403) redirect(`/${locale}/app`);
    redirect(`/${locale}/app/login`);
  }
  await getTranslations({ locale, namespace: "hub.platformOperator" });

  let unionName: string | null = null;
  let rows: Array<{
    id: string;
    localNumber: string;
    subText: string;
    archivedAt: Date | null;
    isDemo: boolean;
  }> = [];

  try {
    const db = getDb();
    const u = await db
      .select({ id: unions.id, name: unions.name })
      .from(unions)
      .where(eq(unions.id, unionId))
      .limit(1);
    unionName = u[0]?.name ?? null;

    const conditions: SQL[] = [eq(locals.unionId, unionId)];
    rows = await db
      .select({
        id: locals.id,
        localNumber: locals.localNumber,
        subText: locals.subText,
        archivedAt: locals.archivedAt,
        isDemo: locals.isDemo,
      })
      .from(locals)
      .where(and(...conditions))
      .orderBy(locals.localNumber);

    await auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.local.list",
      resourceType: "site_admin",
      resourceId: unionId,
      unionId,
      metadata: { resultCount: String(rows.length) },
    });
  } catch {
    rows = [];
  }

  if (!unionName) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/app/site-admin/locals"
          className="text-sm text-opseu-blue hover:underline"
        >
          ← Locals
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-opseu-dark">
          Union not found
        </h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 lg:py-12">
      <Link
        href="/app/site-admin/locals"
        className="text-sm text-opseu-blue hover:underline"
      >
        ← Locals
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
          {unionName} locals
        </h1>
        <p className="mt-1 text-sm text-opseu-gray-dark">
          Archive a local to remove it from active rosters while preserving
          its data. Hard delete lands in v2; today, archive is the recommended
          action.
        </p>
      </header>

      <div className="mt-6 overflow-x-auto rounded-md border border-opseu-gray/15 bg-white">
        <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
          <thead className="bg-opseu-gray/5 text-left text-xs uppercase text-opseu-gray-dark">
            <tr>
              <th className="px-3 py-2">Local</th>
              <th className="px-3 py-2">Sub-line</th>
              <th className="px-3 py-2">Demo</th>
              <th className="px-3 py-2">Archived</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-opseu-gray/10">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 font-mono text-xs text-opseu-dark">
                  {r.localNumber}
                </td>
                <td className="px-3 py-2 text-opseu-gray-dark">
                  {r.subText || "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.isDemo ? (
                    <span className="rounded bg-opseu-orange/20 px-2 py-0.5 text-opseu-orange-dark">
                      demo
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.archivedAt
                    ? r.archivedAt.toISOString().slice(0, 10)
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <form
                    method="POST"
                    action={`/api/site-admin/locals/${encodeURIComponent(r.id)}/${r.archivedAt ? "restore" : "archive"}`}
                    className="inline"
                  >
                    <button
                      type="submit"
                      className="rounded-md border border-opseu-gray/30 bg-white px-2 py-1 text-xs font-semibold text-opseu-dark shadow-sm transition hover:border-opseu-blue/40 hover:text-opseu-blue"
                    >
                      {r.archivedAt ? "Restore" : "Archive"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {rows.filter((r) => !r.archivedAt).length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-sm text-opseu-gray-dark">
                  No active locals.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
