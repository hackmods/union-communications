import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema/tenant";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";

export const dynamic = "force-dynamic";

export default async function AccountSupportSearchPage({
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
  if (!gate.ok) {
    if (gate.status === 403) redirect(`/${locale}/app`);
    redirect(`/${locale}/app/login`);
  }
  const t = await getTranslations({ locale, namespace: "hub.platformOperator" });

  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();
  const results: Array<{
    id: string;
    email: string;
    name: string;
    roles: string[];
    isDemo: boolean;
    archivedAt: Date | null;
  }> = [];

  if (q) {
    try {
      const db = getDb();
      const sub = `%${q.slice(0, 80)}%`;
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          roles: users.roles,
          isDemo: users.isDemo,
          archivedAt: users.archivedAt,
        })
        .from(users)
        .where(
          and(
            or(ilike(users.email, sub), ilike(users.name, sub)),
            isNull(users.archivedAt),
            eq(users.isDemo, false),
          ),
        )
        .limit(50);
      results.push(...rows);
      await auditLog.log({
        userId: gate.session.user.id,
        action: "site_admin.user.cross_tenant_read",
        resourceType: "site_admin",
        resourceId: "account-support.search",
        metadata: { q, resultCount: String(rows.length) },
      });
    } catch {
      // Render empty results rather than crash the operator page; the audit
      // was scaffolded by the API route on hard lookups.
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
        {t("accountSupport")}
      </h1>
      <p className="mt-1 text-sm text-opseu-gray-dark">
        {t("accountSupportSearchBody")}
      </p>

      <form
        method="GET"
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder={t("accountSupportSearchPlaceholder")}
          autoFocus
          className="flex-1 rounded-md border border-opseu-gray/30 bg-white px-3 py-2 text-sm shadow-sm focus:border-opseu-blue focus:outline-none focus:ring-2 focus:ring-opseu-blue/30"
        />
        <button
          type="submit"
          className="rounded-md bg-opseu-blue px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opseu-blue/90 focus:outline-none focus:ring-2 focus:ring-opseu-blue/50"
        >
          {t("accountSupportSearch")}
        </button>
      </form>

      {q && results.length === 0 && (
        <p className="mt-6 text-sm text-opseu-gray-dark">
          {t("accountSupportNoMatches", { q })}
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-6 divide-y divide-opseu-gray/15 rounded-md border border-opseu-gray/15 bg-white">
          {results.map((r) => (
            <li key={r.id} className="px-3 py-2 text-sm">
              <Link
                href={`/app/site-admin/account-support/${encodeURIComponent(r.id)}`}
                className="flex items-baseline justify-between gap-3 hover:underline"
              >
                <span className="font-semibold text-opseu-dark">
                  {r.name}
                </span>
                <span className="text-opseu-gray-dark">{r.email}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
