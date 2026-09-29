import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { and, eq, isNull, type SQL } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { divisions, locals, unions } from "@/lib/db/schema/tenant";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import {
  countUnionAttachments,
  isUnionEmpty,
} from "@/lib/site-admin/union-lifecycle";
import type { UnionLifecycleRow } from "@/lib/site-admin/union-lifecycle-shared";
import { CreateLocalForm } from "@/components/site-admin/CreateLocalForm";
import { LocalArchiveButton } from "@/components/site-admin/LocalArchiveButton";
import { UnionLocalsLifecyclePanel } from "@/components/site-admin/UnionLocalsLifecyclePanel";

export const dynamic = "force-dynamic";

async function loadUnionLifecycleRow(
  unionId: string,
): Promise<UnionLifecycleRow | null> {
  const db = getDb();
  const [u] = await db
    .select({
      id: unions.id,
      name: unions.name,
      slug: unions.slug,
      isDemo: unions.isDemo,
      archivedAt: unions.archivedAt,
      createdAt: unions.createdAt,
      membershipPolicy: unions.membershipPolicy,
    })
    .from(unions)
    .where(eq(unions.id, unionId))
    .limit(1);
  if (!u) return null;
  const counts = await countUnionAttachments(unionId);
  return {
    id: u.id,
    name: u.name,
    slug: u.slug,
    isDemo: u.isDemo,
    archivedAt: u.archivedAt ? u.archivedAt.toISOString() : null,
    createdAt: u.createdAt ? u.createdAt.toISOString() : null,
    membershipPolicy: u.membershipPolicy ?? "multi_local",
    localCount: counts.locals,
    activeLocalCount: counts.activeLocals,
    userCount: counts.users,
    inviteCount: counts.invites,
    membershipCount: counts.memberships,
    caseworkCount: counts.casework,
    empty: isUnionEmpty(counts),
  };
}

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
  const t = await getTranslations({ locale, namespace: "hub.platformOperator" });

  let unionRow: UnionLifecycleRow | null = null;
  let collectiveRows: Array<{ id: string; name: string }> = [];
  let rows: Array<{
    id: string;
    localNumber: string;
    subText: string;
    archivedAt: Date | null;
    isDemo: boolean;
  }> = [];

  if (isPostgresConfigured()) {
    try {
      unionRow = await loadUnionLifecycleRow(unionId);

      if (unionRow) {
        const db = getDb();
        collectiveRows = await db
          .select({ id: divisions.id, name: divisions.name })
          .from(divisions)
          .where(
            and(eq(divisions.unionId, unionId), isNull(divisions.archivedAt)),
          )
          .orderBy(divisions.name);

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
      }
    } catch {
      rows = [];
      unionRow = null;
    }
  }

  if (!unionRow) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/app/site-admin/locals"
          className="text-sm text-opseu-blue hover:underline"
        >
          ← {t("locals")}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-opseu-dark">
          {t("unionNotFound")}
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
        ← {t("locals")}
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
          {t("unionLocalsTitle", { name: unionRow.name })}
        </h1>
        <p className="mt-1 text-sm text-opseu-gray-dark">
          {t("unionLocalsBody")}
        </p>
      </header>

      <UnionLocalsLifecyclePanel union={unionRow} />

      <div className="mt-6 overflow-x-auto rounded-md border border-opseu-gray/15 bg-white">
        <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
          <thead className="bg-opseu-gray/5 text-left text-xs uppercase text-opseu-gray-dark">
            <tr>
              <th className="px-3 py-2">{t("localsColNumber")}</th>
              <th className="px-3 py-2">{t("localsColSubline")}</th>
              <th className="px-3 py-2">{t("localsColDemo")}</th>
              <th className="px-3 py-2">{t("localsColArchived")}</th>
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
                      {t("usersDemoBadge")}
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
                  <LocalArchiveButton
                    localId={r.id}
                    archived={Boolean(r.archivedAt)}
                  />
                </td>
              </tr>
            ))}
            {rows.filter((r) => !r.archivedAt).length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-4 text-center text-sm text-opseu-gray-dark"
                >
                  {t("localsNoneActive")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CreateLocalForm
        unionId={unionId}
        membershipPolicy={unionRow.membershipPolicy}
        collectives={collectiveRows}
      />
    </main>
  );
}
