import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import {
  readMemberBroadcastTokenKeys,
  verifyMemberBroadcastToken,
} from "@/lib/email/member-broadcast-config";

function isYes(rows: unknown, key: string): boolean {
  const row = Array.isArray(rows) ? rows[0] : null;
  return row != null && typeof row === "object" && (row as Record<string, unknown>)[key] === true;
}

/** Public unsubscribe — durable suppression even when no prior consent row exists. */
export async function unsubscribeMemberBroadcast(token: unknown): Promise<boolean> {
  if (!isPostgresConfigured()) return false;
  const keys = readMemberBroadcastTokenKeys();
  const verified = verifyMemberBroadcastToken(token, "unsubscribe", keys);
  if (!verified) return false;
  const rows = await getDb().execute(
    sql`SELECT public.member_broadcast_revoke_from_token(${verified.hash}, ${randomUUID()}, 'email_link') AS revoked`,
  );
  return isYes(rows, "revoked");
}
