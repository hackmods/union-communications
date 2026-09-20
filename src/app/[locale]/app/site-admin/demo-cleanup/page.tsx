import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import {
  DEMO_PURGE_CONFIRM_PHRASE,
  countDemoRows,
  totalDemoCount,
} from "@/lib/site-admin/demo-purge";
import { DemoPurgeForm } from "@/components/site-admin/DemoPurgeForm";

export const dynamic = "force-dynamic";

export default async function SiteAdminDemoCleanupPage({
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

  const counts = {
    users: 0,
    unions: 0,
    divisions: 0,
    locals: 0,
  };

  if (isPostgresConfigured()) {
    try {
      const db = getDb();
      Object.assign(counts, await countDemoRows(db));
      await auditLog.log({
        userId: gate.session.user.id,
        action: "site_admin.demo.preview_purge",
        resourceType: "site_admin",
        resourceId: "demo.cleanup",
        metadata: {
          users: String(counts.users),
          unions: String(counts.unions),
          divisions: String(counts.divisions),
          locals: String(counts.locals),
        },
      });
    } catch {
      // counts stay zero.
    }
  }

  const total = totalDemoCount(counts);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
        Demo cleanup
      </h1>
      <p className="mt-1 text-sm text-opseu-gray-dark">
        Preview of rows flagged <code className="text-xs">is_demo = true</code>{" "}
        by the site-admin backfill. Pre-purging visibility:{" "}
        <strong>{total}</strong> demo-shaped rows across the four canonical
        tenant tables.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Users" value={counts.users} />
        <Stat label="Unions" value={counts.unions} />
        <Stat label="Divisions" value={counts.divisions} />
        <Stat label="Locals" value={counts.locals} />
      </div>

      <DemoPurgeForm
        counts={counts}
        confirmPhrase={DEMO_PURGE_CONFIRM_PHRASE}
      />

      <section className="mt-8 rounded-md border border-opseu-orange/30 bg-opseu-orange/5 p-4 text-sm">
        <h2 className="font-semibold text-opseu-dark">Ops CLI</h2>
        <p className="mt-1 text-opseu-gray-dark">
          Same counts and confirmation phrase via{" "}
          <code className="text-xs">npm run db:demo-purge</code> (
          <code className="text-xs">scripts/demo-purge.ts</code>). Use{" "}
          <code className="text-xs">--dry-run</code> for preview only. The CLI
          requires <code className="text-xs">MIGRATE_DATABASE_URL</code> for
          the destructive step so RLS cannot leave orphan casework.
        </p>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-opseu-gray/15 bg-white p-3 text-center">
      <div className="text-2xl font-bold text-opseu-dark">{value}</div>
      <div className="text-xs text-opseu-gray-dark">{label}</div>
    </div>
  );
}
