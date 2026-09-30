import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { assertCronSecret, parseCronDryRun } from "@/lib/meetings/officer-reminder-cron";
import { getObjectStorage } from "@/lib/attachments/storage";
import { auditLog } from "@/lib/audit/store";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { reportApiFailure } from "@/lib/observability/report-server-error";

type EligibleRow = { document_id: string; storage_keys: string[] };

async function handle(request: Request, dryOnly = false) {
  const secret = process.env.CRON_SECRET;
  if (!assertCronSecret(request.headers.get("authorization"), secret) && !assertCronSecret(request.headers.get("x-cron-secret"), secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPostgresConfigured()) return NextResponse.json({ error: "Retention purge requires Postgres" }, { status: 503 });
  const dryRun = dryOnly || parseCronDryRun(new URL(request.url).searchParams);
  try {
    const result = await withRlsContext({ retentionJob: true }, async () => {
      const listed = await getDb().execute(sql`SELECT * FROM app_list_expired_documents()`);
      const eligible = listed as unknown as EligibleRow[];
      if (dryRun) return { eligibleCount: eligible.length, documentIds: eligible.map((row) => row.document_id), purgedCount: 0 };
      const storage = getObjectStorage();
      const keys = [...new Set(eligible.flatMap((row) => Array.isArray(row.storage_keys) ? row.storage_keys : []))];
      for (const key of keys) {
        await storage.delete(key);
        if (await storage.exists(key)) throw new Error("An expired document object could not be removed; database records were retained");
      }
      const ids = [...new Set(eligible.map((row) => row.document_id))];
      const deleted = ids.length ? await getDb().execute(sql`SELECT app_purge_expired_documents(${ids}::text[]) AS purged_count`) : [];
      const purgedCount = Number(deleted[0]?.purged_count ?? 0);
      if (purgedCount !== ids.length) throw new Error("Purge eligibility changed during the retention transaction; rerun the dry run");
      await auditLog.log({ userId: "system-cron", action: "document.retention.purge", resourceType: "document", resourceId: "*", metadata: { eligible: String(ids.length), purged: String(purgedCount), dryRun: "false" } });
      return { eligibleCount: eligible.length, documentIds: ids, purgedCount };
    });
    if (dryRun) await auditLog.log({ userId: "system-cron", action: "document.retention.dry_run", resourceType: "document", resourceId: "*", metadata: { eligible: String(result.eligibleCount), dryRun: "true" } });
    return NextResponse.json({ ok: true, dryRun, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    reportApiFailure(error, "/api/cron/document-retention", { source: "cron" });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Retention job failed" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function GET(request: Request) { return handle(request, true); }
export async function POST(request: Request) { return handle(request); }
