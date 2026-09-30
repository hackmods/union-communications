/**
 * In-memory outreach list store for unit tests (ADR-023).
 * Production paths use Postgres via outreach-lists.ts.
 */

import { randomUUID } from "node:crypto";
import { marketingEmailLookupKey } from "@/lib/email/marketing-consent";
import { OUTREACH_LIST_NOTICE_VERSION } from "@/lib/email/outreach-list-notice";

export type MemoryOutreachList = {
  id: string;
  unionId: string;
  name: string;
  slug: string;
  status: "active" | "paused";
};

export type MemoryOutreachSubscriber = {
  id: string;
  listId: string;
  unionId: string;
  email: string;
  lookupKey: string;
  locale: "en" | "fr";
  status: "pending_confirmation" | "confirmed" | "suppressed";
  wordingVersion: string | null;
};

export type MemoryOutreachSuppression = {
  unionId: string;
  lookupKey: string;
  email: string;
  reason: string;
};

const lists: MemoryOutreachList[] = [];
const subscribers: MemoryOutreachSubscriber[] = [];
const suppressions: MemoryOutreachSuppression[] = [];
const confirmTokens: Array<{
  tokenHash: string;
  subscriberId: string;
  expiresAt: Date;
  consumed: boolean;
}> = [];

export function resetOutreachListsMemory(): void {
  lists.length = 0;
  subscribers.length = 0;
  suppressions.length = 0;
  confirmTokens.length = 0;
}

export function memoryStoreConfirmToken(input: {
  tokenHash: string;
  subscriberId: string;
  expiresAt: Date;
}): void {
  confirmTokens.push({ ...input, consumed: false });
}

export function memoryConsumeConfirmToken(tokenHash: string): boolean {
  const row = confirmTokens.find(
    (t) => t.tokenHash === tokenHash && !t.consumed && t.expiresAt.getTime() > Date.now(),
  );
  if (!row) return false;
  if (!memoryConfirmSubscriber(row.subscriberId)) return false;
  row.consumed = true;
  return true;
}

export function memoryCreateList(input: {
  unionId: string;
  name: string;
  slug: string;
}): MemoryOutreachList {
  const row: MemoryOutreachList = {
    id: randomUUID(),
    unionId: input.unionId,
    name: input.name,
    slug: input.slug,
    status: "active",
  };
  lists.push(row);
  return row;
}

export function memoryImportSubscribers(input: {
  unionId: string;
  listId: string;
  rows: Array<{ email: string; locale: "en" | "fr" }>;
}): { imported: number; skipped: number } {
  if (!lists.some((l) => l.id === input.listId && l.unionId === input.unionId)) {
    return { imported: 0, skipped: input.rows.length };
  }
  let imported = 0;
  let skipped = 0;
  for (const row of input.rows) {
    const lookupKey = marketingEmailLookupKey(row.email);
    if (!lookupKey) {
      skipped += 1;
      continue;
    }
    if (subscribers.some((s) => s.listId === input.listId && s.lookupKey === lookupKey)) {
      skipped += 1;
      continue;
    }
    if (suppressions.some((s) => s.unionId === input.unionId && s.lookupKey === lookupKey)) {
      skipped += 1;
      continue;
    }
    subscribers.push({
      id: randomUUID(),
      listId: input.listId,
      unionId: input.unionId,
      email: row.email.trim().toLowerCase(),
      lookupKey,
      locale: row.locale,
      status: "pending_confirmation",
      wordingVersion: null,
    });
    imported += 1;
  }
  return { imported, skipped };
}

export function memoryConfirmSubscriber(subscriberId: string): boolean {
  const sub = subscribers.find((s) => s.id === subscriberId);
  if (!sub || sub.status !== "pending_confirmation") return false;
  sub.status = "confirmed";
  sub.wordingVersion = OUTREACH_LIST_NOTICE_VERSION;
  return true;
}

export function memoryIsSuppressed(unionId: string, lookupKey: string): boolean {
  return suppressions.some((s) => s.unionId === unionId && s.lookupKey === lookupKey);
}

export function memoryAddSuppression(input: {
  unionId: string;
  lookupKey: string;
  email: string;
  reason: string;
}): void {
  const existing = suppressions.find(
    (s) => s.unionId === input.unionId && s.lookupKey === input.lookupKey,
  );
  if (existing) {
    existing.reason = input.reason;
    existing.email = input.email;
    return;
  }
  suppressions.push({ ...input });
  const sub = subscribers.find(
    (s) => s.unionId === input.unionId && s.lookupKey === input.lookupKey,
  );
  if (sub) sub.status = "suppressed";
}

export function memoryListConfirmed(unionId: string, listId: string): MemoryOutreachSubscriber[] {
  return subscribers.filter(
    (s) =>
      s.unionId === unionId &&
      s.listId === listId &&
      s.status === "confirmed" &&
      s.wordingVersion === OUTREACH_LIST_NOTICE_VERSION &&
      !memoryIsSuppressed(unionId, s.lookupKey),
  );
}

export function memoryGetLists(unionId: string): MemoryOutreachList[] {
  return lists.filter((l) => l.unionId === unionId);
}

export function memoryListSubscriberCounts(listId: string): {
  confirmed: number;
  pending: number;
} {
  const listSubs = subscribers.filter((s) => s.listId === listId);
  return {
    confirmed: listSubs.filter((s) => s.status === "confirmed").length,
    pending: listSubs.filter((s) => s.status === "pending_confirmation").length,
  };
}
