/**
 * Compatibility façade — prefer `officerLearningStore` from `./store`.
 * Sync helpers wrap the memory adapter for unit tests that predate the adapter.
 */
export type {
  LocalReportRow,
  OfficerLearningLocalSettings,
  OfficerLearningUserRecord,
} from "./types-hub";

import { memoryOfficerLearningStore, resetOfficerLearningMemoryForTests } from "./memory-adapter";
import type {
  OfficerLearningLocalSettings,
  OfficerLearningUserRecord,
} from "./types-hub";

export function getOfficerLearningUser(unionId: string, userId: string) {
  return memoryOfficerLearningStore.getUser(unionId, userId);
}

export function upsertOfficerLearningUser(
  input: Omit<OfficerLearningUserRecord, "updatedAt"> & { updatedAt?: string },
) {
  return memoryOfficerLearningStore.upsertUser(input);
}

export function getOfficerLearningLocalSettings(unionId: string, localId: string) {
  return memoryOfficerLearningStore.getLocalSettings(unionId, localId);
}

export function saveOfficerLearningLocalSettings(input: OfficerLearningLocalSettings) {
  return memoryOfficerLearningStore.saveLocalSettings(input);
}

export function listSharedCompletionsForLocal(unionId: string, localId: string) {
  return memoryOfficerLearningStore.listSharedCompletions(unionId, localId);
}

export function resetOfficerLearningHubStoreForTests(): void {
  resetOfficerLearningMemoryForTests();
}
