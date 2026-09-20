import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  proposalEvents,
  proposalPackages,
  proposalPublications,
  proposalRows,
} from "@/lib/db/schema";
import type { ProposalsAdapter } from "./adapter";
import type {
  HubProposalEvent,
  HubProposalPackage,
  HubProposalRow,
  ProposalPublication,
} from "@/types/hub-proposals";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapPackage(
  row: typeof proposalPackages.$inferSelect,
): HubProposalPackage {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    bargainingUnitId: row.bargainingUnitId ?? undefined,
    name: row.name,
    roundLabel: row.roundLabel,
    status: row.status as HubProposalPackage["status"],
    caucusNote: row.caucusNote,
    publishedAt: toIso(row.publishedAt),
    publishedSummary: row.publishedSummary as HubProposalPackage["publishedSummary"],
    createdById: row.createdById,
    updatedById: row.updatedById,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

function mapRow(row: typeof proposalRows.$inferSelect): HubProposalRow {
  return {
    id: row.id,
    packageId: row.packageId,
    unionId: row.unionId,
    localId: row.localId,
    article: row.article,
    currentLanguage: row.currentLanguage,
    unionProposal: row.unionProposal,
    employerCounter: row.employerCounter,
    status: row.status as HubProposalRow["status"],
    notes: row.notes,
    sortOrder: row.sortOrder,
    assigneeIds: row.assigneeIds ?? [],
    updatedAt: toIso(row.updatedAt)!,
  };
}

function mapEvent(row: typeof proposalEvents.$inferSelect): HubProposalEvent {
  return {
    id: row.id,
    packageId: row.packageId,
    rowId: row.rowId ?? undefined,
    unionId: row.unionId,
    localId: row.localId,
    authorId: row.authorId,
    authorName: row.authorName,
    kind: row.kind as HubProposalEvent["kind"],
    body: row.body,
    createdAt: toIso(row.createdAt)!,
  };
}

function mapPublication(
  row: typeof proposalPublications.$inferSelect,
): ProposalPublication {
  return {
    id: row.id,
    packageId: row.packageId,
    unionId: row.unionId,
    localId: row.localId,
    headline: row.headline,
    bullets: row.bullets ?? [],
    guideHref: row.guideHref ?? undefined,
    publishedById: row.publishedById,
    publishedAt: toIso(row.publishedAt)!,
    archivedAt: toIso(row.archivedAt),
  };
}

export class DrizzleProposalsAdapter implements ProposalsAdapter {
  async listPackages(
    unionId: string,
    localId?: string,
  ): Promise<HubProposalPackage[]> {
    const db = getDb();
    const conditions = [eq(proposalPackages.unionId, unionId)];
    if (localId) conditions.push(eq(proposalPackages.localId, localId));
    const rows = await db
      .select()
      .from(proposalPackages)
      .where(and(...conditions))
      .orderBy(desc(proposalPackages.updatedAt));
    return rows.map(mapPackage);
  }

  async getPackage(id: string): Promise<HubProposalPackage | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(proposalPackages)
      .where(eq(proposalPackages.id, id))
      .limit(1);
    return rows[0] ? mapPackage(rows[0]) : null;
  }

  async createPackage(
    input: Omit<
      HubProposalPackage,
      "id" | "createdAt" | "updatedAt" | "publishedAt" | "publishedSummary"
    > & { id?: string },
  ): Promise<HubProposalPackage> {
    const id = input.id ?? newId("ppkg");
    const ts = new Date();
    const db = getDb();
    await db.insert(proposalPackages).values({
      id,
      unionId: input.unionId,
      localId: input.localId,
      bargainingUnitId: input.bargainingUnitId ?? null,
      name: input.name.trim(),
      roundLabel: input.roundLabel ?? "",
      status: input.status ?? "active",
      caucusNote: input.caucusNote ?? "",
      createdById: input.createdById,
      updatedById: input.updatedById,
      createdAt: ts,
      updatedAt: ts,
    });
    const created = await this.getPackage(id);
    if (!created) throw new Error("Failed to create proposal package");
    return created;
  }

  async updatePackage(
    id: string,
    patch: Partial<
      Pick<
        HubProposalPackage,
        | "name"
        | "roundLabel"
        | "status"
        | "caucusNote"
        | "updatedById"
        | "publishedAt"
        | "publishedSummary"
      >
    >,
  ): Promise<HubProposalPackage | null> {
    const existing = await this.getPackage(id);
    if (!existing) return null;
    const db = getDb();
    const set: Partial<typeof proposalPackages.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (patch.name !== undefined) set.name = patch.name.trim();
    if (patch.roundLabel !== undefined) set.roundLabel = patch.roundLabel;
    if (patch.status !== undefined) set.status = patch.status;
    if (patch.caucusNote !== undefined) set.caucusNote = patch.caucusNote;
    if (patch.updatedById !== undefined) set.updatedById = patch.updatedById;
    if (patch.publishedAt !== undefined) set.publishedAt = patch.publishedAt ? new Date(patch.publishedAt) : null;
    if (patch.publishedSummary !== undefined) {
      set.publishedSummary = patch.publishedSummary as typeof proposalPackages.$inferInsert.publishedSummary;
    }
    await db.update(proposalPackages).set(set).where(eq(proposalPackages.id, id));
    return this.getPackage(id);
  }

  async removePackage(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db
      .delete(proposalPackages)
      .where(eq(proposalPackages.id, id))
      .returning({ id: proposalPackages.id });
    return result.length > 0;
  }

  async listRows(packageId: string): Promise<HubProposalRow[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(proposalRows)
      .where(eq(proposalRows.packageId, packageId))
      .orderBy(proposalRows.sortOrder);
    return rows.map(mapRow);
  }

  async upsertRow(
    row: Omit<HubProposalRow, "updatedAt"> & { updatedAt?: string },
  ): Promise<HubProposalRow> {
    const db = getDb();
    const existing = await db
      .select({ id: proposalRows.id })
      .from(proposalRows)
      .where(eq(proposalRows.id, row.id))
      .limit(1);
    const ts = new Date();
    if (existing[0]) {
      await db
        .update(proposalRows)
        .set({
          article: row.article,
          currentLanguage: row.currentLanguage,
          unionProposal: row.unionProposal,
          employerCounter: row.employerCounter,
          status: row.status,
          notes: row.notes,
          sortOrder: row.sortOrder ?? 0,
          assigneeIds: row.assigneeIds ?? [],
          updatedAt: ts,
        })
        .where(eq(proposalRows.id, row.id));
    } else {
      await db.insert(proposalRows).values({
        id: row.id,
        packageId: row.packageId,
        unionId: row.unionId,
        localId: row.localId,
        article: row.article ?? "",
        currentLanguage: row.currentLanguage ?? "",
        unionProposal: row.unionProposal ?? "",
        employerCounter: row.employerCounter ?? "",
        status: row.status,
        notes: row.notes ?? "",
        sortOrder: row.sortOrder ?? 0,
        assigneeIds: row.assigneeIds ?? [],
        updatedAt: ts,
      });
    }
    const rows = await db
      .select()
      .from(proposalRows)
      .where(eq(proposalRows.id, row.id))
      .limit(1);
    return mapRow(rows[0]!);
  }

  async removeRow(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db
      .delete(proposalRows)
      .where(eq(proposalRows.id, id))
      .returning({ id: proposalRows.id });
    return result.length > 0;
  }

  async listEvents(packageId: string): Promise<HubProposalEvent[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(proposalEvents)
      .where(eq(proposalEvents.packageId, packageId))
      .orderBy(desc(proposalEvents.createdAt));
    return rows.map(mapEvent);
  }

  async addEvent(
    event: Omit<HubProposalEvent, "id" | "createdAt"> & { id?: string },
  ): Promise<HubProposalEvent> {
    const db = getDb();
    const id = event.id ?? newId("pevt");
    const createdAt = new Date();
    await db.insert(proposalEvents).values({
      id,
      packageId: event.packageId,
      rowId: event.rowId ?? null,
      unionId: event.unionId,
      localId: event.localId,
      authorId: event.authorId,
      authorName: event.authorName,
      kind: event.kind,
      body: event.body,
      createdAt,
    });
    return {
      id,
      packageId: event.packageId,
      rowId: event.rowId,
      unionId: event.unionId,
      localId: event.localId,
      authorId: event.authorId,
      authorName: event.authorName,
      kind: event.kind,
      body: event.body,
      createdAt: createdAt.toISOString(),
    };
  }

  async listPublications(
    unionId: string,
    localId?: string,
  ): Promise<ProposalPublication[]> {
    const db = getDb();
    const conditions = [
      eq(proposalPublications.unionId, unionId),
      // Member-safe portal snapshots hide archived rows.
      ...(localId ? [eq(proposalPublications.localId, localId)] : []),
    ];
    const rows = await db
      .select()
      .from(proposalPublications)
      .where(and(...conditions))
      .orderBy(desc(proposalPublications.publishedAt));
    return rows.filter((r) => !r.archivedAt).map(mapPublication);
  }

  async publish(
    input: Omit<ProposalPublication, "id" | "publishedAt" | "archivedAt"> & {
      id?: string;
    },
  ): Promise<ProposalPublication> {
    const db = getDb();
    const id = input.id ?? newId("ppub");
    const publishedAt = new Date();
    await db.insert(proposalPublications).values({
      id,
      packageId: input.packageId,
      unionId: input.unionId,
      localId: input.localId,
      headline: input.headline,
      bullets: input.bullets,
      guideHref: input.guideHref ?? null,
      publishedById: input.publishedById,
      publishedAt,
    });
    return {
      id,
      packageId: input.packageId,
      unionId: input.unionId,
      localId: input.localId,
      headline: input.headline,
      bullets: [...input.bullets],
      guideHref: input.guideHref,
      publishedById: input.publishedById,
      publishedAt: publishedAt.toISOString(),
    };
  }

  async archivePublication(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db
      .update(proposalPublications)
      .set({ archivedAt: new Date() })
      .where(eq(proposalPublications.id, id))
      .returning({ id: proposalPublications.id });
    return result.length > 0;
  }
}