import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext, type RlsSessionContext } from "@/lib/db/rls-context";
import {
  outreachConsentEvents,
  outreachLists,
  outreachSubscribers,
  outreachSuppressions,
} from "@/lib/db/schema/outreach";
import { marketingEmailLookupKey } from "@/lib/email/marketing-consent";
import { OUTREACH_LIST_NOTICE } from "@/lib/email/outreach-list-notice";
import { memoryImportSubscribers } from "@/lib/email/outreach-lists-memory";

export type OutreachImportRow = { email: string; locale: "en" | "fr" };

const MAX_ROWS = 5000;

/** Parse a simple CSV with header `email` and optional `locale` (en|fr). */
export function parseOutreachImportCsv(text: string): OutreachImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0]!.split(",").map((cell) => cell.trim().toLowerCase());
  const emailIdx = header.indexOf("email");
  if (emailIdx < 0) return [];
  const localeIdx = header.indexOf("locale");
  const rows: OutreachImportRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",").map((cell) => cell.trim());
    const email = cells[emailIdx];
    if (!email || !email.includes("@")) continue;
    const localeRaw = localeIdx >= 0 ? cells[localeIdx]?.toLowerCase() : "en";
    const locale = localeRaw === "fr" ? "fr" : "en";
    rows.push({ email, locale });
    if (rows.length >= MAX_ROWS) break;
  }
  return rows;
}

export type OutreachImportResult = {
  dryRun: boolean;
  imported: number;
  skipped: number;
  pendingOnly: true;
};

export async function importOutreachSubscribers(input: {
  unionId: string;
  listId: string;
  rows: OutreachImportRow[];
  dryRun: boolean;
  attestation: string;
  actorId: string;
  requestId: string;
  rls: RlsSessionContext;
}): Promise<OutreachImportResult | "invalid_attestation" | "list_not_found"> {
  const attestation = input.attestation.trim();
  if (attestation.length < 20 || attestation.length > 2000) {
    return "invalid_attestation";
  }
  if (!isPostgresConfigured()) {
    const result = memoryImportSubscribers({
      unionId: input.unionId,
      listId: input.listId,
      rows: input.rows,
    });
    return {
      dryRun: input.dryRun,
      imported: result.imported,
      skipped: result.skipped,
      pendingOnly: true,
    };
  }
  return withRlsContext(input.rls, async () => {
    const db = getDb();
    const [list] = await db
      .select({ id: outreachLists.id })
      .from(outreachLists)
      .where(
        and(eq(outreachLists.id, input.listId), eq(outreachLists.unionId, input.unionId)),
      )
      .limit(1);
    if (!list) return "list_not_found";

    let imported = 0;
    let skipped = 0;
    for (const row of input.rows) {
      const lookupKey = marketingEmailLookupKey(row.email);
      if (!lookupKey) {
        skipped += 1;
        continue;
      }
      const [suppressed] = await db
        .select({ id: outreachSuppressions.id })
        .from(outreachSuppressions)
        .where(
          and(
            eq(outreachSuppressions.unionId, input.unionId),
            eq(outreachSuppressions.lookupKey, lookupKey),
          ),
        )
        .limit(1);
      if (suppressed) {
        skipped += 1;
        continue;
      }
      const [existing] = await db
        .select({ id: outreachSubscribers.id })
        .from(outreachSubscribers)
        .where(
          and(
            eq(outreachSubscribers.listId, input.listId),
            eq(outreachSubscribers.lookupKey, lookupKey),
          ),
        )
        .limit(1);
      if (existing) {
        skipped += 1;
        continue;
      }
      if (input.dryRun) {
        imported += 1;
        continue;
      }
      const subscriberId = randomUUID();
      const grantId = randomUUID();
      await db.insert(outreachSubscribers).values({
        id: subscriberId,
        listId: input.listId,
        unionId: input.unionId,
        email: row.email.trim().toLowerCase(),
        lookupKey,
        locale: row.locale,
        status: "pending_confirmation",
        latestGrantId: grantId,
      });
      await db.insert(outreachConsentEvents).values({
        id: grantId,
        subscriberId,
        unionId: input.unionId,
        listId: input.listId,
        destinationEmail: row.email.trim().toLowerCase(),
        eventType: "import_attestation",
        locale: row.locale,
        wordingVersion: null,
        wordingText: OUTREACH_LIST_NOTICE[row.locale],
        source: "csv_import",
        grantEventId: null,
        reason: attestation.slice(0, 500),
        actorId: input.actorId,
        requestId: input.requestId,
      });
      imported += 1;
    }
    return { dryRun: input.dryRun, imported, skipped, pendingOnly: true };
  });
}
