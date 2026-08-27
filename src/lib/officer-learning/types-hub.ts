import type { LearningProgressStore, ModuleProgress } from "./types";

export type OfficerLearningUserRecord = {
  userId: string;
  unionId: string;
  localId: string;
  displayName: string;
  hubSyncEnabled: boolean;
  shareWithLocal: boolean;
  modules: LearningProgressStore;
  updatedAt: string;
};

export type OfficerLearningLocalSettings = {
  unionId: string;
  localId: string;
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
