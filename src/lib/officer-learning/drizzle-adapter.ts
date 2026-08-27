import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  officerLearningLocalSettings,
  officerLearningUsers,
} from "@/lib/db/schema";
import type { OfficerLearningAdapter } from "./adapter";
import type {
  LocalReportRow,
  OfficerLearningLocalSettings,
  OfficerLearningUserRecord,
} from "./types-hub";
import type { LearningProgressStore } from "./types";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string | null | undefined): string {
  if (value == null) return new Date(0).toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapUser(
  row: typeof officerLearningUsers.$inferSelect,
): OfficerLearningUserRecord {
  return {
    userId: row.userId,
    unionId: row.unionId,
    localId: row.localId,
    displayName: row.displayName,
    hubSyncEnabled: row.hubSyncEnabled,
    shareWithLocal: row.shareWithLocal,
    modules: (row.modules ?? {}) as LearningProgressStore,
    updatedAt: toIso(row.updatedAt),
  };
}

function mapSettings(
  row: typeof officerLearningLocalSettings.$inferSelect,
): OfficerLearningLocalSettings {
  return {
    unionId: row.unionId,
    localId: row.localId,
    reportingEnabled: row.reportingEnabled,
    updatedById: row.updatedById,
    updatedAt: toIso(row.updatedAt),
  };
}

export class DrizzleOfficerLearningAdapter implements OfficerLearningAdapter {
  async getUser(
    unionId: string,
    userId: string,
  ): Promise<OfficerLearningUserRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(officerLearningUsers)
      .where(
        and(
          eq(officerLearningUsers.unionId, unionId),
          eq(officerLearningUsers.userId, userId),
        ),
      )
      .limit(1);
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async upsertUser(
    input: Omit<OfficerLearningUserRecord, "updatedAt"> & { updatedAt?: string },
  ): Promise<OfficerLearningUserRecord> {
    const db = getDb();
    const existing = await this.getUser(input.unionId, input.userId);
    const updatedAt = new Date();
    if (existing) {
      await db
        .update(officerLearningUsers)
        .set({
          localId: input.localId,
          displayName: input.displayName,
          hubSyncEnabled: input.hubSyncEnabled,
          shareWithLocal: input.shareWithLocal,
          modules: input.modules,
          updatedAt,
        })
        .where(
          and(
            eq(officerLearningUsers.unionId, input.unionId),
            eq(officerLearningUsers.userId, input.userId),
          ),
        );
    } else {
      await db.insert(officerLearningUsers).values({
        id: newId("ol-user"),
        userId: input.userId,
        unionId: input.unionId,
        localId: input.localId,
        displayName: input.displayName,
        hubSyncEnabled: input.hubSyncEnabled,
        shareWithLocal: input.shareWithLocal,
        modules: input.modules,
        updatedAt,
      });
    }
    return {
      ...input,
      updatedAt: updatedAt.toISOString(),
    };
  }

  async getLocalSettings(
    unionId: string,
    localId: string,
  ): Promise<OfficerLearningLocalSettings> {
    const db = getDb();
    const rows = await db
      .select()
      .from(officerLearningLocalSettings)
      .where(
        and(
          eq(officerLearningLocalSettings.unionId, unionId),
          eq(officerLearningLocalSettings.localId, localId),
        ),
      )
      .limit(1);
    return rows[0]
      ? mapSettings(rows[0])
      : {
          unionId,
          localId,
          reportingEnabled: false,
          updatedAt: new Date(0).toISOString(),
          updatedById: "",
        };
  }

  async saveLocalSettings(
    input: OfficerLearningLocalSettings,
  ): Promise<OfficerLearningLocalSettings> {
    const db = getDb();
    const updatedAt = new Date();
    const rows = await db
      .select()
      .from(officerLearningLocalSettings)
      .where(
        and(
          eq(officerLearningLocalSettings.unionId, input.unionId),
          eq(officerLearningLocalSettings.localId, input.localId),
        ),
      )
      .limit(1);

    if (rows[0]) {
      await db
        .update(officerLearningLocalSettings)
        .set({
          reportingEnabled: input.reportingEnabled,
          updatedById: input.updatedById,
          updatedAt,
        })
        .where(eq(officerLearningLocalSettings.id, rows[0].id));
    } else {
      await db.insert(officerLearningLocalSettings).values({
        id: newId("ol-local"),
        unionId: input.unionId,
        localId: input.localId,
        reportingEnabled: input.reportingEnabled,
        updatedById: input.updatedById,
        updatedAt,
      });
    }

    return {
      ...input,
      updatedAt: updatedAt.toISOString(),
    };
  }

  async listSharedCompletions(
    unionId: string,
    localId: string,
  ): Promise<LocalReportRow[]> {
    const settings = await this.getLocalSettings(unionId, localId);
    if (!settings.reportingEnabled) return [];

    const db = getDb();
    const rows = await db
      .select()
      .from(officerLearningUsers)
      .where(
        and(
          eq(officerLearningUsers.unionId, unionId),
          eq(officerLearningUsers.localId, localId),
          eq(officerLearningUsers.hubSyncEnabled, true),
          eq(officerLearningUsers.shareWithLocal, true),
        ),
      )
      .orderBy(desc(officerLearningUsers.updatedAt));

    return rows.map((row) => {
      const modules = (row.modules ?? {}) as LearningProgressStore;
      return {
        userId: row.userId,
        displayName: row.displayName,
        modules: Object.fromEntries(
          Object.entries(modules).map(([id, progress]) => [
            id,
            {
              status: progress.status,
              quizPassed: progress.quizPassed,
              lastVisitedAt: progress.lastVisitedAt,
            },
          ]),
        ),
        updatedAt: toIso(row.updatedAt),
      };
    });
  }
}
