import type { LearningProgressStore, ModuleProgress } from "./types";

export type OfficerLearningUserRecord = {
  userId: string;
  unionId: string;
  localId: string;
  displayName: string;
  /** Phase B — sync localStorage progress to Hub account. */
  hubSyncEnabled: boolean;
  /** Phase C — allow local education officers to see completions. */
  shareWithLocal: boolean;
  modules: LearningProgressStore;
  updatedAt: string;
};

export type OfficerLearningLocalSettings = {
  unionId: string;
  localId: string;
  /** Phase C — local must enable reporting before any shared records appear. */
  reportingEnabled: boolean;
  updatedAt: string;
  updatedById: string;
};

export type LocalReportRow = {
  userId: string;
  displayName: string;
  modules: Record<
    string,
    Pick<ModuleProgress, "status" | "quizPassed" | "lastVisitedAt">
  >;
  updatedAt: string;
};

function userKey(unionId: string, userId: string): string {
  return `${unionId}:${userId}`;
}

function localKey(unionId: string, localId: string): string {
  return `${unionId}:${localId}`;
}

const users = new Map<string, OfficerLearningUserRecord>();
const locals = new Map<string, OfficerLearningLocalSettings>();

export function getOfficerLearningUser(
  unionId: string,
  userId: string,
): OfficerLearningUserRecord | null {
  return users.get(userKey(unionId, userId)) ?? null;
}

export function upsertOfficerLearningUser(
  input: Omit<OfficerLearningUserRecord, "updatedAt"> & { updatedAt?: string },
): OfficerLearningUserRecord {
  const next: OfficerLearningUserRecord = {
    ...input,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
  users.set(userKey(next.unionId, next.userId), next);
  return next;
}

export function getOfficerLearningLocalSettings(
  unionId: string,
  localId: string,
): OfficerLearningLocalSettings {
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

export function saveOfficerLearningLocalSettings(
  input: OfficerLearningLocalSettings,
): OfficerLearningLocalSettings {
  const next = { ...input, updatedAt: new Date().toISOString() };
  locals.set(localKey(next.unionId, next.localId), next);
  return next;
}

export function listSharedCompletionsForLocal(
  unionId: string,
  localId: string,
): LocalReportRow[] {
  const settings = getOfficerLearningLocalSettings(unionId, localId);
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

/** @internal test helper */
export function resetOfficerLearningHubStoreForTests(): void {
  users.clear();
  locals.clear();
}
