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
import {
  mintOutreachConfirmToken,
  sendOutreachConfirmEmail,
} from "@/lib/email/outreach-confirm";
import { readOutreachListsConfig } from "@/lib/email/outreach-config";
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
  confirmPreviewUrls?: string[];
  confirmEmailsSent?: number;
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
    if (input.dryRun) {
      const previewUrls: string[] = [];
      let wouldImport = 0;
      let wouldSkip = 0;
      for (const row of input.rows) {
        const lookupKey = marketingEmailLookupKey(row.email);
        if (!lookupKey) {
          wouldSkip += 1;
          continue;
        }
        wouldImport += 1;
        if (previewUrls.length < 25) {
          previewUrls.push(
            `[dry-run] confirm:${row.email.trim().toLowerCase()}@${input.listId}`,
          );
        }
      }
      return {
        dryRun: true,
        imported: wouldImport,
        skipped: wouldSkip,
        pendingOnly: true,
        confirmPreviewUrls: previewUrls,
      };
    }
    const result = memoryImportSubscribers({
      unionId: input.unionId,
      listId: input.listId,
      rows: input.rows,
    });
    return {
      dryRun: false,
      imported: result.imported,
      skipped: result.skipped,
      pendingOnly: true,
      confirmEmailsSent: 0,
    };
  }
  return withRlsContext(input.rls, async () => {
    const db = getDb();
    const [list] = await db
      .select({ id: outreachLists.id, name: outreachLists.name })
      .from(outreachLists)
      .where(
        and(eq(outreachLists.id, input.listId), eq(outreachLists.unionId, input.unionId)),
      )
      .limit(1);
    if (!list) return "list_not_found";

    const config = readOutreachListsConfig();
    const confirmPreviewUrls: string[] = [];
    let confirmEmailsSent = 0;

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
        if (config.baseUrl && config.tokenKeys.length) {
          const preview = await mintOutreachConfirmToken({
            unionId: input.unionId,
            listId: input.listId,
            subscriberId: randomUUID(),
            grantEventId: null,
            rls: input.rls,
            locale: row.locale,
            previewOnly: true,
          });
          if (preview?.confirmUrl) confirmPreviewUrls.push(preview.confirmUrl);
        } else {
          confirmPreviewUrls.push(`[dry-run] confirm:${row.email.trim().toLowerCase()}`);
        }
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
      const minted = await mintOutreachConfirmToken({
        unionId: input.unionId,
        listId: input.listId,
        subscriberId,
        grantEventId: grantId,
        locale: row.locale,
        rls: input.rls,
      });
      if (config.enabled && minted?.confirmUrl) {
        const sent = await sendOutreachConfirmEmail({
          to: row.email.trim().toLowerCase(),
          locale: row.locale,
          listName: list.name,
          confirmUrl: minted.confirmUrl,
          config,
        });
        if (sent) confirmEmailsSent += 1;
      }
      imported += 1;
    }
    return {
      dryRun: input.dryRun,
      imported,
      skipped,
      pendingOnly: true,
      ...(input.dryRun && confirmPreviewUrls.length
        ? { confirmPreviewUrls }
        : {}),
      ...(!input.dryRun ? { confirmEmailsSent } : {}),
    };
  });
}
