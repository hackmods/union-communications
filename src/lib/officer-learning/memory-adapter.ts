import type { OfficerLearningAdapter } from "./adapter";
import type {
  LocalReportRow,
  OfficerLearningLocalSettings,
  OfficerLearningUserRecord,
} from "./types-hub";

function userKey(unionId: string, userId: string): string {
  return `${unionId}:${userId}`;
}

function localKey(unionId: string, localId: string): string {
  return `${unionId}:${localId}`;
}

const users = new Map<string, OfficerLearningUserRecord>();
const locals = new Map<string, OfficerLearningLocalSettings>();

export class MemoryOfficerLearningAdapter implements OfficerLearningAdapter {
  async getUser(
    unionId: string,
    userId: string,
  ): Promise<OfficerLearningUserRecord | null> {
    return users.get(userKey(unionId, userId)) ?? null;
  }

  async upsertUser(
    input: Omit<OfficerLearningUserRecord, "updatedAt"> & { updatedAt?: string },
  ): Promise<OfficerLearningUserRecord> {
    const next: OfficerLearningUserRecord = {
      ...input,
      updatedAt: input.updatedAt ?? new Date().toISOString(),
    };
    users.set(userKey(next.unionId, next.userId), next);
    return next;
  }

  async getLocalSettings(
    unionId: string,
    localId: string,
  ): Promise<OfficerLearningLocalSettings> {
    return (
      locals.get(localKey(unionId, localId)) ?? {
        unionId,
        localId,
        reportingEnabled: false,
        updatedAt: new Date(0).toISOString(),
        updatedById: "",
      }
    );
  }

  async saveLocalSettings(
    input: OfficerLearningLocalSettings,
  ): Promise<OfficerLearningLocalSettings> {
    const next = { ...input, updatedAt: new Date().toISOString() };
    locals.set(localKey(next.unionId, next.localId), next);
    return next;
  }

  async listSharedCompletions(
    unionId: string,
    localId: string,
  ): Promise<LocalReportRow[]> {
    const settings = await this.getLocalSettings(unionId, localId);
    if (!settings.reportingEnabled) return [];

    const rows: LocalReportRow[] = [];
    for (const record of users.values()) {
      if (record.unionId !== unionId || record.localId !== localId) continue;
      if (!record.shareWithLocal || !record.hubSyncEnabled) continue;
      rows.push({
        userId: record.userId,
        displayName: record.displayName,
        modules: Object.fromEntries(
          Object.entries(record.modules).map(([id, progress]) => [
            id,
            {
              status: progress.status,
              quizPassed: progress.quizPassed,
              lastVisitedAt: progress.lastVisitedAt,
            },
          ]),
        ),
        updatedAt: record.updatedAt,
      });
    }
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}

export const memoryOfficerLearningStore = new MemoryOfficerLearningAdapter();

/** @internal test helper */
export function resetOfficerLearningMemoryForTests(): void {
  users.clear();
  locals.clear();
}
