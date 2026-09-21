import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  committeeMemberships,
  committees,
  localMemberships,
  users,
} from "@/lib/db/schema";
import type { CommitteesAdapter } from "./adapter";
import type {
  Committee,
  CommitteeListFilters,
  CreateCommitteeInput,
  UpdateCommitteeInput,
} from "@/types/committees";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapRow(
  row: typeof committees.$inferSelect,
  memberUserIds: string[] = [],
): Committee {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    name: row.name,
    description: row.description ?? undefined,
    memberOfficerIds: row.memberOfficerIds ?? [],
    memberUserIds,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

export class DrizzleCommitteesAdapter implements CommitteesAdapter {
  async list(filters: CommitteeListFilters): Promise<Committee[]> {
    const db = getDb();
    const conditions = [eq(committees.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(committees.localId, filters.localId));
    }
    const rows = await db
      .select()
      .from(committees)
      .where(and(...conditions));
    if (rows.length === 0) return [];
    const memberships = await db
      .select({ committeeId: committeeMemberships.committeeId, userId: committeeMemberships.userId })
      .from(committeeMemberships)
      .where(inArray(committeeMemberships.committeeId, rows.map((row) => row.id)));
    const membersByCommittee = new Map<string, string[]>();
    for (const membership of memberships) {
      const ids = membersByCommittee.get(membership.committeeId) ?? [];
      ids.push(membership.userId);
      membersByCommittee.set(membership.committeeId, ids);
    }
    return rows
      .map((row) => mapRow(row, membersByCommittee.get(row.id) ?? []))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getById(id: string): Promise<Committee | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(committees)
      .where(eq(committees.id, id))
      .limit(1);
    if (!rows[0]) return null;
    const memberships = await db
      .select({ userId: committeeMemberships.userId })
      .from(committeeMemberships)
      .where(eq(committeeMemberships.committeeId, id));
    return mapRow(rows[0], memberships.map((membership) => membership.userId));
  }

  async create(
    input: CreateCommitteeInput,
    meta: { unionId: string; localId: string },
  ): Promise<Committee> {
    const db = getDb();
    const id = newId("com");
    const ts = new Date();
    await db.transaction(async (tx) => {
      await tx.insert(committees).values({
        id,
        unionId: meta.unionId,
        localId: meta.localId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        memberOfficerIds: [...(input.memberOfficerIds ?? [])],
        createdAt: ts,
        updatedAt: ts,
      });
      const memberUserIds = await this.resolveMemberUserIds(
        tx,
        meta.unionId,
        meta.localId,
        input.memberUserIds ?? [],
      );
      await this.replaceMemberships(tx, id, meta.unionId, meta.localId, memberUserIds);
    });
    const created = await this.getById(id);
    if (!created) throw new Error("Failed to create committee");
    return created;
  }

  async update(
    id: string,
    input: UpdateCommitteeInput,
  ): Promise<Committee | null> {
    const db = getDb();
    const changed = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(committees)
        .where(eq(committees.id, id))
        .limit(1);
      if (!existing) return false;
      const patch: Partial<typeof committees.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.description !== undefined) {
        patch.description =
          input.description === null || input.description.trim() === ""
            ? null
            : input.description.trim();
      }
      if (input.memberOfficerIds !== undefined) {
        patch.memberOfficerIds = [...input.memberOfficerIds];
      }
      await tx.update(committees).set(patch).where(eq(committees.id, id));
      if (input.memberUserIds !== undefined) {
        const memberUserIds = await this.resolveMemberUserIds(
          tx,
          existing.unionId,
          existing.localId,
          input.memberUserIds,
        );
        await this.replaceMemberships(tx, id, existing.unionId, existing.localId, memberUserIds);
      }
      return true;
    });
    if (!changed) return null;
    return this.getById(id);
  }

  async remove(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db
      .delete(committees)
      .where(eq(committees.id, id))
      .returning({ id: committees.id });
    return result.length > 0;
  }

  private async resolveMemberUserIds(
    tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
    unionId: string,
    localId: string,
    selectedIds: string[],
  ): Promise<string[]> {
    const desiredIds = [...new Set(selectedIds)];
    if (desiredIds.length === 0) return [];
    const active = await tx
      .select({ userId: localMemberships.userId })
      .from(localMemberships)
      .innerJoin(users, eq(users.id, localMemberships.userId))
      .where(and(
        eq(localMemberships.unionId, unionId),
        eq(localMemberships.localId, localId),
        inArray(localMemberships.userId, desiredIds),
        eq(localMemberships.status, "active"),
        // Dates/account state are checked in SQL so stale membership links
        // cannot survive an assignment change.
        sql`${localMemberships.endedAt} IS NULL AND ${localMemberships.startedAt} <= now()`,
        sql`${users.archivedAt} IS NULL AND ${users.lockedAt} IS NULL`,
        eq(users.unionId, unionId),
      ));
    const activeIds = new Set(active.map((row) => row.userId));
    const invalid = desiredIds.filter((userId) => !activeIds.has(userId));
    if (invalid.length > 0) throw new InvalidCommitteeMembersError();
    return desiredIds;
  }

  private async replaceMemberships(
    tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
    committeeId: string,
    unionId: string,
    localId: string,
    desiredIds: string[],
  ): Promise<void> {
    const current = await tx
      .select({ userId: committeeMemberships.userId })
      .from(committeeMemberships)
      .where(eq(committeeMemberships.committeeId, committeeId));
    const currentIds = new Set(current.map((row) => row.userId));
    const desired = new Set(desiredIds);
    const removals = [...currentIds].filter((userId) => !desired.has(userId));
    if (removals.length > 0) {
      await tx.delete(committeeMemberships).where(and(
        eq(committeeMemberships.committeeId, committeeId),
        inArray(committeeMemberships.userId, removals),
      ));
    }
    const additions = desiredIds.filter((userId) => !currentIds.has(userId));
    if (additions.length > 0) {
      await tx.insert(committeeMemberships).values(additions.map((userId) => ({
        id: newId("cm"),
        committeeId,
        unionId,
        localId,
        userId,
        role: "member",
      })));
    }
  }
}

export class InvalidCommitteeMembersError extends Error {
  constructor() {
    super("Committee members must be active accounts with membership in this local");
    this.name = "InvalidCommitteeMembersError";
  }
}
