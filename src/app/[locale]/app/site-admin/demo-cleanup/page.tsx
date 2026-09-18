import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  users,
  unions,
  divisions,
  locals,
} from "@/lib/db/schema/tenant";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";

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

  try {
    const db = getDb();
    const [u] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.isDemo, true));
    const [n] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(unions)
      .where(eq(unions.isDemo, true));
    const [d] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(divisions)
      .where(eq(divisions.isDemo, true));
    const [l] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(locals)
      .where(eq(locals.isDemo, true));
    counts.users = u?.n ?? 0;
    counts.unions = n?.n ?? 0;
    counts.divisions = d?.n ?? 0;
    counts.locals = l?.n ?? 0;
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

  const total = counts.users + counts.unions + counts.divisions + counts.locals;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
        Demo cleanup
      </h1>
      <p className="mt-1 text-sm text-opseu-gray-dark">
        Preview of rows flagged <code className="text-xs">is_demo = true</code>{" "}
        by the data-migration backfill. Pre-purging visibility into the
        payroll photo: <strong>{total}</strong> demo-shaped rows exist across
        the four canonical tenant tables.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Users" value={counts.users} />
        <Stat label="Unions" value={counts.unions} />
        <Stat label="Divisions" value={counts.divisions} />
        <Stat label="Locals" value={counts.locals} />
      </div>

      <section className="mt-8 rounded-md border border-opseu-orange/30 bg-opseu-orange/5 p-4 text-sm">
        <h2 className="font-semibold text-opseu-dark">Long-term plan</h2>
        <p className="mt-1 text-opseu-gray-dark">
          The <code className="text-xs">is_demo</code> registry is the durable
          lever. The purge action itself ships in v2 with a typed-confirmation
          form + actor re-auth — running a destructive delete from this
          preview UI today is intentionally not exposed.
        </p>
        <p className="mt-2 text-opseu-gray-dark">
          Until v2 lands, the canonical ops path is{" "}
          <code className="text-xs">scripts/demo-purge.ts</code> (CLI;{" "}
          <code className="text-xs">db:demo-purge</code>). The CLI prints
          exactly the same counts as this preview and only deletes after the
          operator typed &ldquo;DELETE demo&rdquo;.
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
