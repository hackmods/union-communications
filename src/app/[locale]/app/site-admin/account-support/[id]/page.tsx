import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { getDb } from "@/lib/db/client";
import {
  users,
  unions,
  locals,
} from "@/lib/db/schema/tenant";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { formatRoleList } from "@/lib/auth/role-labels";
import { AssignLocalForm } from "@/components/site-admin/AssignLocalForm";
import { EditRolesForm } from "@/components/site-admin/EditRolesForm";

export const dynamic = "force-dynamic";

export default async function AccountSupportDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    if (gate.status === 403) redirect(`/${locale}/app`);
    redirect(`/${locale}/app/login`);
  }
  const t = await getTranslations({ locale, namespace: "hub.platformOperator" });
  const tRoles = await getTranslations({ locale, namespace: "hub.roleLabels" });

  let profile: {
    id: string;
    email: string;
    name: string;
    unionId: string | null;
    localId: string | null;
    roles: string[];
    mfaEnabled: boolean;
    sessionVersion: number;
    archivedAt: Date | null;
    lockedAt: Date | null;
    lockedReason: string | null;
    isDemo: boolean;
    createdAt: Date;
    unionName: string | null;
    localNumber: string | null;
  } | null = null;

  try {
    const db = getDb();
    const fetched = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        unionId: users.unionId,
        localId: users.localId,
        roles: users.roles,
        mfaEnabled: users.mfaEnabled,
        sessionVersion: users.sessionVersion,
        archivedAt: users.archivedAt,
        lockedAt: users.lockedAt,
        lockedReason: users.lockedReason,
        isDemo: users.isDemo,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    const row = fetched[0];
    if (row) {
      const [u, l] = await Promise.all([
        row.unionId
          ? db
              .select({ name: unions.name })
              .from(unions)
              .where(eq(unions.id, row.unionId))
              .limit(1)
          : Promise.resolve([] as Array<{ name: string }>),
        row.localId
          ? db
              .select({ localNumber: locals.localNumber })
              .from(locals)
              .where(eq(locals.id, row.localId))
              .limit(1)
          : Promise.resolve([] as Array<{ localNumber: string }>),
      ]);
      profile = {
        ...row,
        unionName: u[0]?.name ?? null,
        localNumber: l[0]?.localNumber ?? null,
      };
    }
  } catch {
    profile = null;
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/app/site-admin/account-support"
          className="text-sm text-opseu-blue hover:underline"
        >
          ← {t("accountSupportBack")}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-opseu-dark">
          {t("accountSupportUserNotFound")}
        </h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <Link
        href="/app/site-admin/account-support"
        className="text-sm text-opseu-blue hover:underline"
      >
        ← {t("accountSupportBack")}
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
          {profile.name}
        </h1>
        <p className="mt-1 text-sm text-opseu-gray-dark">{profile.email}</p>
      </header>

      <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-2 rounded-md border border-opseu-gray/15 bg-white p-4 text-sm sm:grid-cols-2">
        <Row label={t("accountSupportLabelId")} value={profile.id} />
        <Row
          label={t("accountSupportLabelUnion")}
          value={
            profile.unionId
              ? `${profile.unionName ?? profile.unionId}`
              : "—"
          }
        />
        <Row
          label={t("accountSupportLabelLocal")}
          value={
            profile.localId
              ? t("accountSupportLocalValue", {
                  number: profile.localNumber ?? profile.localId,
                })
              : "—"
          }
        />
        <Row
          label={t("accountSupportLabelRoles")}
          value={formatRoleList(profile.roles, tRoles) || "—"}
        />
        <Row
          label={t("accountSupportLabelMfa")}
          value={
            profile.mfaEnabled
              ? t("accountSupportMfaEnrolled")
              : t("accountSupportMfaNotEnrolled")
          }
        />
        <Row
          label={t("accountSupportLabelSession")}
          value={String(profile.sessionVersion)}
        />
        <Row
          label={t("accountSupportLabelDemo")}
          value={profile.isDemo ? t("accountSupportYes") : t("accountSupportNo")}
        />
        <Row
          label={t("accountSupportLabelArchived")}
          value={
            profile.archivedAt
              ? profile.archivedAt.toISOString().slice(0, 19).replace("T", " ")
              : t("accountSupportNo")
          }
        />
        <Row
          label={t("accountSupportLabelLocked")}
          value={
            profile.lockedAt
              ? `${profile.lockedReason ?? t("accountSupportNoLockReason")}`
              : t("accountSupportNo")
          }
        />
        <Row
          label={t("accountSupportLabelCreated")}
          value={profile.createdAt
            .toISOString()
            .slice(0, 19)
            .replace("T", " ")}
        />
      </dl>

      <AssignLocalForm
        userId={profile.id}
        initialUnionId={profile.unionId}
        initialLocalId={profile.localId}
      />

      <EditRolesForm
        userId={profile.id}
        initialRoles={profile.roles}
        archived={profile.archivedAt !== null}
      />

      <form
        action={`/api/site-admin/users/${profile.id}/force-password-reset`}
        method="POST"
        className="mt-6 flex items-center gap-3"
      >
        <input type="hidden" name="id" value={profile.id} />
        <button
          type="submit"
          disabled={profile.archivedAt !== null}
          className="rounded-md bg-opseu-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-opseu-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("accountSupportForcePassword")}
        </button>
        {profile.archivedAt && (
          <span className="text-xs text-opseu-gray-dark">
            {t("accountSupportCannotResetArchived")}
          </span>
        )}
      </form>

      <p className="mt-6 text-xs text-opseu-gray-dark">
        {t("accountSupportOtherActionsLead")}{" "}
        <Link
          href="/app/site-admin/users"
          className="text-opseu-blue hover:underline"
        >
          {t("users")}
        </Link>{" "}
        {t("accountSupportOtherActionsTail")}
      </p>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-opseu-gray-dark">{label}</dt>
      <dd className="font-mono text-xs text-opseu-dark">{value}</dd>
    </>
  );
}
