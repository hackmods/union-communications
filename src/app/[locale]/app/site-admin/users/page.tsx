import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { getDb } from "@/lib/db/client";
import { locals, users } from "@/lib/db/schema/tenant";
import { redirectUnlessSiteAdmin, requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { formatRoleList } from "@/lib/auth/role-labels";
import { isDemoPurgeEnabled } from "@/lib/features/demo-purge";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function SiteAdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  const gate = await requireSiteAdminSession();
  redirectUnlessSiteAdmin(locale, gate, "/app/site-admin/users");
  const t = await getTranslations({ locale, namespace: "hub.platformOperator" });
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();
  const tRoles = await getTranslations({ locale, namespace: "hub.roleLabels" });
  const demoPurgeOn = isDemoPurgeEnabled();

  let rows: Array<{
    id: string;
    email: string;
    name: string;
    roles: string[];
    unionId: string | null;
    localId: string | null;
    localNumber: string | null;
    archivedAt: Date | null;
    isDemo: boolean;
    createdAt: Date;
  }> = [];

  try {
    const db = getDb();
    const searchClause = q
      ? or(ilike(users.email, `%${q.slice(0, 80)}%`), ilike(users.name, `%${q.slice(0, 80)}%`))
      : undefined;

    const fetched = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        roles: users.roles,
        unionId: users.unionId,
        localId: users.localId,
        archivedAt: users.archivedAt,
        isDemo: users.isDemo,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        searchClause
          ? and(isNull(users.archivedAt), searchClause)
          : isNull(users.archivedAt),
      )
      .orderBy(desc(users.createdAt))
      .limit(PAGE_SIZE);

    const localIds = [
      ...new Set(
        fetched.map((r) => r.localId).filter((id): id is string => Boolean(id)),
      ),
    ];
    const localNumberById = new Map<string, string>();
    if (localIds.length > 0) {
      for (const lid of localIds) {
        const [row] = await db
          .select({ id: locals.id, localNumber: locals.localNumber })
          .from(locals)
          .where(eq(locals.id, lid))
          .limit(1);
        if (row) localNumberById.set(row.id, row.localNumber);
      }
    }

    rows = fetched.map((r) => ({
      ...r,
      localNumber: r.localId
        ? (localNumberById.get(r.localId) ?? null)
        : null,
    }));

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
  const orphanCount = rows.filter((r) => r.unionId && !r.localId).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
          {t("users")}
        </h1>
        <p className="mt-1 text-sm text-opseu-gray-dark">
          {t("usersListLead", { count: rows.length, demoCount })}
          {demoPurgeOn ? (
            <>
              {" "}
              —{" "}
              <Link
                href="/app/site-admin/demo-cleanup"
                className="text-opseu-blue hover:underline"
              >
                {t("demoCleanup")}
              </Link>
            </>
          ) : null}
          {" · "}
          <Link
            href="/app/site-admin/account-support"
            className="text-opseu-blue hover:underline"
          >
            {t("usersSearchLink")}
          </Link>
        </p>
        {orphanCount > 0 ? (
          <p className="mt-2 text-sm text-opseu-orange-dark">
            {t("usersOrphanLead", { count: orphanCount })}{" "}
            <Link
              href="/app/site-admin/membership-integrity"
              className="text-opseu-blue hover:underline"
            >
              {t("membershipIntegrity")}
            </Link>
          </p>
        ) : null}
      </header>

      <form method="GET" className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={t("usersSearchPlaceholder")}
          className="min-w-[12rem] flex-1 rounded-md border border-opseu-gray/30 bg-white px-3 py-2 text-sm shadow-sm focus:border-opseu-blue focus:outline-none focus:ring-2 focus:ring-opseu-blue/30"
          aria-label={t("usersSearchPlaceholder")}
        />
        <button
          type="submit"
          className="rounded-md bg-opseu-blue px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opseu-blue/90 focus:outline-none focus:ring-2 focus:ring-opseu-blue/50"
        >
          {t("usersSearch")}
        </button>
        {q ? (
          <Link
            href="/app/site-admin/users"
            className="rounded-md px-3 py-2 text-sm font-medium text-opseu-blue hover:underline focus:outline-none focus:ring-2 focus:ring-opseu-blue/50"
          >
            {t("usersSearchClear")}
          </Link>
        ) : null}
      </form>

      {q && rows.length === 0 ? (
        <p className="mb-4 text-sm text-opseu-gray-dark">
          {t("usersSearchNoMatches", { q })}{" "}
          <Link
            href="/app/site-admin/users"
            className="text-opseu-blue hover:underline"
          >
            {t("usersSearchClear")}
          </Link>
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-opseu-gray/15 bg-white">
        <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
          <thead className="bg-opseu-gray/5 text-left text-xs uppercase text-opseu-gray-dark">
            <tr>
              <th className="px-3 py-2">{t("usersColName")}</th>
              <th className="px-3 py-2">{t("usersColEmail")}</th>
              <th className="px-3 py-2">{t("usersColLocal")}</th>
              <th className="px-3 py-2">{t("usersColRoles")}</th>
              <th className="px-3 py-2">{t("usersColDemo")}</th>
              <th className="px-3 py-2">{t("usersColCreated")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-opseu-gray/10">
            {rows.map((r) => {
              const orphan = Boolean(r.unionId && !r.localId);
              return (
                <tr
                  key={r.id}
                  className={orphan ? "bg-opseu-orange/5" : undefined}
                >
                  <td className="px-3 py-2 font-semibold text-opseu-dark">
                    {r.name}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-opseu-gray-dark">
                    {r.email}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-opseu-gray-dark">
                    {r.localNumber
                      ? r.localNumber
                      : orphan
                        ? t("usersLocalMissing")
                        : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-opseu-gray-dark">
                    {formatRoleList(r.roles, tRoles) || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.isDemo ? (
                      <span className="rounded bg-opseu-orange/20 px-2 py-0.5 text-opseu-orange-dark">
                        {t("usersDemoBadge")}
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
                      {t("usersOpen")}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-opseu-gray-dark">
        {t("usersFooter", { pageSize: PAGE_SIZE })}{" "}
        <Link
          href="/app/site-admin/organization"
          className="text-opseu-blue hover:underline"
        >
          {t("locals")}
        </Link>
      </p>
    </main>
  );
}
