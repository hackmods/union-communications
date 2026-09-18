import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { desc, isNull } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema/tenant";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function SiteAdminUsersPage({
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
  await getTranslations({ locale, namespace: "hub.platformOperator" });

  let rows: Array<{
    id: string;
    email: string;
    name: string;
    roles: string[];
    archivedAt: Date | null;
    isDemo: boolean;
    createdAt: Date;
  }> = [];

  try {
    const db = getDb();
    rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        roles: users.roles,
        archivedAt: users.archivedAt,
        isDemo: users.isDemo,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(isNull(users.archivedAt))
      .orderBy(desc(users.createdAt))
      .limit(PAGE_SIZE);

    await auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.user.list",
      resourceType: "site_admin",
      resourceId: "users.list",
      metadata: { resultCount: String(rows.length) },
    });
  } catch {
    rows = [];
  }

  const demoCount = rows.filter((r) => r.isDemo).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
          Users
        </h1>
        <p className="mt-1 text-sm text-opseu-gray-dark">
          Latest {rows.length} active accounts across all unions. {demoCount}{" "}
          marked demo — use the{" "}
          <Link
            href="/app/site-admin/demo-cleanup"
            className="text-opseu-blue hover:underline"
          >
            demo cleanup
          </Link>{" "}
          page to purge.
        </p>
      </header>

      <div className="overflow-x-auto rounded-md border border-opseu-gray/15 bg-white">
        <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
          <thead className="bg-opseu-gray/5 text-left text-xs uppercase text-opseu-gray-dark">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Demo</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-opseu-gray/10">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 font-semibold text-opseu-dark">
                  {r.name}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-opseu-gray-dark">
                  {r.email}
                </td>
                <td className="px-3 py-2 text-xs text-opseu-gray-dark">
                  {r.roles.join(", ") || "—"}
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
                <td className="px-3 py-2 font-mono text-xs text-opseu-gray-dark">
                  {r.createdAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/app/site-admin/account-support/${encodeURIComponent(r.id)}`}
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

      <p className="mt-3 text-xs text-opseu-gray-dark">
        Showing latest {PAGE_SIZE}. Bulk archive / hard-delete actions ship in
        v2 — today, archive via{" "}
        <Link
          href="/app/site-admin/locals"
          className="text-opseu-blue hover:underline"
        >
          Locals
        </Link>{" "}
        or by an account support action.
      </p>
    </main>
  );
}
