import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { and, asc, eq, type SQL } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { locals, unions } from "@/lib/db/schema/tenant";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import {
  countUnionAttachments,
  isUnionEmpty,
} from "@/lib/site-admin/union-lifecycle";
import type { UnionLifecycleRow } from "@/lib/site-admin/union-lifecycle-shared";
import {
  countLocalAttachments,
  isLocalEmpty,
} from "@/lib/site-admin/local-lifecycle";
import { listCollectivesForUnion } from "@/lib/site-admin/collective-lifecycle";
import {
  brandCollectiveOptionsForPreset,
  brandCollectionOptionsForPreset,
} from "@/lib/site-admin/brand-structure-options";
import { CreateLocalForm } from "@/components/site-admin/CreateLocalForm";
import { LocalLifecycleActions } from "@/components/site-admin/LocalLifecycleActions";
import { CollectivesAdminPanel } from "@/components/site-admin/CollectivesAdminPanel";
import { UnionLocalsLifecyclePanel } from "@/components/site-admin/UnionLocalsLifecyclePanel";

export const dynamic = "force-dynamic";

async function loadUnionLifecycleRow(
  unionId: string,
): Promise<(UnionLifecycleRow & { commsPresetId: string | null }) | null> {
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
      commsPresetId: unions.commsPresetId,
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
    commsPresetId: u.commsPresetId ?? null,
  };
}

export default async function SiteAdminOrganizationUnionPage({
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

  let unionRow: Awaited<ReturnType<typeof loadUnionLifecycleRow>> = null;
  let collectiveRows: Awaited<ReturnType<typeof listCollectivesForUnion>> = [];
  let rows: Array<{
    id: string;
    localNumber: string;
    subText: string;
    divisionId: string | null;
    archivedAt: Date | null;
    isDemo: boolean;
    empty: boolean;
  }> = [];

  if (isPostgresConfigured()) {
    try {
      unionRow = await loadUnionLifecycleRow(unionId);

      if (unionRow) {
        const db = getDb();
        collectiveRows = await listCollectivesForUnion(unionId);

        const conditions: SQL[] = [eq(locals.unionId, unionId)];
        const localRows = await db
          .select({
            id: locals.id,
            localNumber: locals.localNumber,
            subText: locals.subText,
            divisionId: locals.divisionId,
            archivedAt: locals.archivedAt,
            isDemo: locals.isDemo,
          })
          .from(locals)
          .where(and(...conditions))
          .orderBy(asc(locals.localNumber));

        rows = await Promise.all(
          localRows.map(async (r) => {
            const counts = await countLocalAttachments(r.id);
            return {
              ...r,
              empty: isLocalEmpty(counts),
            };
          }),
        );

        await auditLog.log({
          userId: gate.session.user.id,
          action: "site_admin.organization.union_view",
          resourceType: "site_admin",
          resourceId: unionId,
          unionId,
          metadata: {
            localCount: String(rows.length),
            collectiveCount: String(collectiveRows.length),
          },
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
          href="/app/site-admin/organization"
          className="text-sm text-opseu-blue hover:underline"
        >
          ← {t("organization")}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-opseu-dark">
          {t("unionNotFound")}
        </h1>
      </main>
    );
  }

  const activeCollectives = collectiveRows
    .filter((row) => !row.archivedAt)
    .map((row) => ({ id: row.id, name: row.name }));
  const collectiveCatalog = brandCollectiveOptionsForPreset(
    unionRow.commsPresetId,
  );
  const collectionCatalog = brandCollectionOptionsForPreset(
    unionRow.commsPresetId,
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 lg:py-12">
      <Link
        href="/app/site-admin/organization"
        className="text-sm text-opseu-blue hover:underline"
      >
        ← {t("organization")}
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
          {t("organizationUnionTitle", { name: unionRow.name })}
        </h1>
        <p className="mt-1 text-sm text-opseu-gray-dark">
          {t("organizationUnionBody")}
        </p>
      </header>

      <UnionLocalsLifecyclePanel union={unionRow} />

      <CollectivesAdminPanel rows={collectiveRows} />

      <section className="mt-6">
        <header className="mb-3">
          <h2 className="text-lg font-semibold text-opseu-dark">
            {t("localsPanelTitle")}
          </h2>
          <p className="mt-1 text-sm text-opseu-gray-dark">
            {t("localsPanelBody")}
          </p>
        </header>
        <div className="overflow-x-auto rounded-md border border-opseu-gray/15 bg-white">
          <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
            <thead className="bg-opseu-gray/5 text-left text-xs uppercase text-opseu-gray-dark">
              <tr>
                <th className="px-3 py-2">{t("localsColNumber")}</th>
                <th className="px-3 py-2">{t("localsColSubline")}</th>
                <th className="px-3 py-2">{t("localsColCollective")}</th>
                <th className="px-3 py-2">{t("localsColDemo")}</th>
                <th className="px-3 py-2">{t("localsColArchived")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-opseu-gray/10">
              {rows.map((r) => {
                const collectiveName =
                  collectiveRows.find((c) => c.id === r.divisionId)?.name ??
                  null;
                return (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-mono text-xs text-opseu-dark">
                      {r.localNumber}
                    </td>
                    <td className="px-3 py-2 text-opseu-gray-dark">
                      {r.subText || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-opseu-gray-dark">
                      {collectiveName ?? "—"}
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
                      <LocalLifecycleActions
                        localId={r.id}
                        localNumber={r.localNumber}
                        subText={r.subText}
                        divisionId={r.divisionId}
                        archived={Boolean(r.archivedAt)}
                        empty={r.empty}
                        collectives={activeCollectives}
                        deleteBlockedReason={
                          r.archivedAt && !r.empty
                            ? t("localDeleteBlocked")
                            : null
                        }
                      />
                    </td>
                  </tr>
                );
              })}
              {rows.filter((r) => !r.archivedAt).length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-4 text-center text-sm text-opseu-gray-dark"
                  >
                    {t("localsNoneActive")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CreateLocalForm
        unionId={unionId}
        membershipPolicy={unionRow.membershipPolicy}
        collectives={activeCollectives}
        collectiveCatalog={collectiveCatalog}
        collectionCatalog={collectionCatalog}
      />
    </main>
  );
}
