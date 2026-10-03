import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { accessRequests } from "@/lib/db/schema/access-requests";
import type {
  AccessRequest,
  AccessRequestPatch,
  NewAccessRequest,
} from "@/types/access-request";
import type { AccessRequestAdapter } from "./adapter";

const iso = (v: Date | null) => v?.toISOString();

function map(r: typeof accessRequests.$inferSelect): AccessRequest {
  return {
    id: r.id,
    submissionKey: r.submissionKey,
    kind: r.kind,
    name: r.name,
    email: r.email,
    unionName: r.unionName,
    localName: r.localName,
    role: r.role ?? undefined,
    offerings: r.offerings,
    message: r.message ?? undefined,
    locale: r.locale,
    consentAcceptedAt: r.consentAcceptedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    status: r.status,
    unionId: r.unionId ?? undefined,
    localId: r.localId ?? undefined,
    privateNote: r.privateNote ?? undefined,
    reviewedById: r.reviewedById ?? undefined,
    inviteId: r.inviteId ?? undefined,
    receiptSentAt: iso(r.receiptSentAt),
    notifySentAt: iso(r.notifySentAt),
    notificationError: r.notificationError ?? undefined,
    reviewHistory: r.reviewHistory,
  };
}

export class DrizzleAccessRequestAdapter implements AccessRequestAdapter {
  async create(input: NewAccessRequest) {
    const now = new Date();
    const row: typeof accessRequests.$inferSelect = {
      id: `access-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      submissionKey: input.submissionKey,
      kind: input.kind,
      name: input.name,
      email: input.email,
      unionName: input.unionName,
      localName: input.localName,
      role: input.role ?? null,
      offerings: input.offerings,
      message: input.message ?? null,
      locale: input.locale,
      consentAcceptedAt: now,
      createdAt: now,
      status: "new",
      unionId: null,
      localId: null,
      privateNote: null,
      reviewedById: null,
      inviteId: null,
      receiptSentAt: null,
      notifySentAt: null,
      notificationError: null,
      reviewHistory: [],
    };
    // Public INSERT is allowed by access_requests_public_submit. There is no
    // SELECT policy for unassigned rows, and INSERT … RETURNING applies SELECT
    // policies to the new row — so RETURNING would abort a valid write.
    await getDb().insert(accessRequests).values(row);
    return map(row);
  }

  async list(
    filters: {
      status?: AccessRequest["status"];
      kind?: AccessRequest["kind"];
      unionId?: string;
      localId?: string;
    } = {},
  ) {
    const c = [];
    if (filters.status) c.push(eq(accessRequests.status, filters.status));
    if (filters.kind) c.push(eq(accessRequests.kind, filters.kind));
    if (filters.unionId) c.push(eq(accessRequests.unionId, filters.unionId));
    if (filters.localId) c.push(eq(accessRequests.localId, filters.localId));
    const rows = await getDb()
      .select()
      .from(accessRequests)
      .where(c.length ? and(...c) : undefined)
      .orderBy(desc(accessRequests.createdAt));
    return rows.map(map);
  }

  async getById(id: string) {
    const row = (
      await getDb()
        .select()
        .from(accessRequests)
        .where(eq(accessRequests.id, id))
        .limit(1)
    )[0];
    return row ? map(row) : null;
  }

  async update(id: string, patch: AccessRequestPatch) {
    const values: Partial<typeof accessRequests.$inferInsert> = {};
    if (patch.status) values.status = patch.status;
    if (patch.unionId !== undefined) values.unionId = patch.unionId;
    if (patch.localId !== undefined) values.localId = patch.localId;
    if (patch.privateNote !== undefined) values.privateNote = patch.privateNote;
    if (patch.reviewedById !== undefined) values.reviewedById = patch.reviewedById;
    if (patch.inviteId !== undefined) values.inviteId = patch.inviteId;
    if (patch.notificationError !== undefined) {
      values.notificationError = patch.notificationError;
    }
    if (patch.receiptSentAt !== undefined) {
      values.receiptSentAt = patch.receiptSentAt
        ? new Date(patch.receiptSentAt)
        : null;
    }
    if (patch.notifySentAt !== undefined) {
      values.notifySentAt = patch.notifySentAt
        ? new Date(patch.notifySentAt)
        : null;
    }
    if (patch.reviewedById || patch.status || patch.privateNote) {
      const existing = await this.getById(id);
      values.reviewHistory = [
        ...(existing?.reviewHistory ?? []),
        {
          at: new Date().toISOString(),
          userId: patch.reviewedById ?? "operator",
          status: patch.status ?? undefined,
          note: patch.privateNote ?? undefined,
        },
      ];
    }
    const row = (
      await getDb()
        .update(accessRequests)
        .set(values)
        .where(eq(accessRequests.id, id))
        .returning()
    )[0];
    return row ? map(row) : null;
  }
}
