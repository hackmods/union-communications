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
  await getTranslations({ locale, namespace: "hub.platformOperator" });

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
          ← Account support
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-opseu-dark">
          User not found
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
        ← Account support
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
          {profile.name}
        </h1>
        <p className="mt-1 text-sm text-opseu-gray-dark">{profile.email}</p>
      </header>

      <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-2 rounded-md border border-opseu-gray/15 bg-white p-4 text-sm sm:grid-cols-2">
        <Row label="ID" value={profile.id} />
        <Row
          label="Union"
          value={
            profile.unionId
              ? `${profile.unionName ?? profile.unionId}`
              : "—"
          }
        />
        <Row
          label="Local"
          value={
            profile.localId
              ? `Local ${profile.localNumber ?? profile.localId}`
              : "—"
          }
        />
        <Row label="Roles" value={profile.roles.join(", ") || "—"} />
        <Row
          label="MFA"
          value={profile.mfaEnabled ? "Enrolled" : "Not enrolled"}
        />
        <Row label="Session version" value={String(profile.sessionVersion)} />
        <Row
          label="Demo"
          value={profile.isDemo ? "Yes" : "No"}
        />
        <Row
          label="Archived"
          value={
            profile.archivedAt
              ? profile.archivedAt.toISOString().slice(0, 19).replace("T", " ")
              : "No"
          }
        />
        <Row
          label="Locked"
          value={
            profile.lockedAt
              ? `${profile.lockedReason ?? "no reason given"}`
              : "No"
          }
        />
        <Row
          label="Created"
          value={profile.createdAt
            .toISOString()
            .slice(0, 19)
            .replace("T", " ")}
        />
      </dl>

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
          Force password reset
        </button>
        {profile.archivedAt && (
          <span className="text-xs text-opseu-gray-dark">
            cannot reset archived account
          </span>
        )}
      </form>

      <p className="mt-6 text-xs text-opseu-gray-dark">
        Other actions (rotate MFA, lock account, change email) ship in v2.
        See{" "}
        <Link
          href="/app/site-admin/users"
          className="text-opseu-blue hover:underline"
        >
          Users
        </Link>{" "}
        for the cross-tenant directory.
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
