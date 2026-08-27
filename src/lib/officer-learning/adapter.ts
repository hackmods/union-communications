import type {
  LocalReportRow,
  OfficerLearningLocalSettings,
  OfficerLearningUserRecord,
} from "./types-hub";

export type {
  LocalReportRow,
  OfficerLearningLocalSettings,
  OfficerLearningUserRecord,
} from "./types-hub";

export interface OfficerLearningAdapter {
  getUser(
    unionId: string,
    userId: string,
  ): Promise<OfficerLearningUserRecord | null>;
  upsertUser(
    input: Omit<OfficerLearningUserRecord, "updatedAt"> & { updatedAt?: string },
  ): Promise<OfficerLearningUserRecord>;
  getLocalSettings(
    unionId: string,
    localId: string,
  ): Promise<OfficerLearningLocalSettings>;
  saveLocalSettings(
    input: OfficerLearningLocalSettings,
  ): Promise<OfficerLearningLocalSettings>;
  listSharedCompletions(
    unionId: string,
    localId: string,
  ): Promise<LocalReportRow[]>;
}
