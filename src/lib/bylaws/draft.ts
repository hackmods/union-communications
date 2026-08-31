import {
  clearJsonDraft,
  loadJsonDraft,
  saveJsonDraft,
} from "@/lib/steward-guides/storage";
import {
  isBylawDraft,
  isBylawFormValues,
  type BylawDraft,
  type BylawFormValues,
} from "./build-template";

const BYLAW_DRAFT_STORAGE_KEY_V2 = "unionops.bylaw-builder.draft.v2";
const BYLAW_DRAFT_STORAGE_KEY_V1 = "unionops.bylaw-builder.draft.v1";

function migrateV1ToDraft(value: BylawFormValues): BylawDraft {
  return {
    ...value,
    mode: "template",
    articleSet: "standard",
    articleOverrides: {},
    committeeNotes: {},
    existingBylaws: "",
  };
}

export function bylawDraftStorageKey(circleId?: string | null): string {
  if (circleId) {
    return `${BYLAW_DRAFT_STORAGE_KEY_V2}.circle.${circleId}`;
  }
  return BYLAW_DRAFT_STORAGE_KEY_V2;
}

export function createBylawDraftStorage(circleId?: string | null) {
  const key = bylawDraftStorageKey(circleId);

  return {
    load: (): BylawDraft | null => {
      const current = loadJsonDraft(key, isBylawDraft);
      if (current) return current;

      if (circleId) return null;

      const legacy = loadJsonDraft(BYLAW_DRAFT_STORAGE_KEY_V1, isBylawFormValues);
      return legacy ? migrateV1ToDraft(legacy) : null;
    },
    save: (draft: BylawDraft): boolean => saveJsonDraft(key, draft),
    clear: (): boolean => {
      if (!circleId) clearJsonDraft(BYLAW_DRAFT_STORAGE_KEY_V1);
      return clearJsonDraft(key);
    },
  };
}

const defaultStorage = createBylawDraftStorage();

export function loadBylawDraft(): BylawDraft | null {
  return defaultStorage.load();
}

export function saveBylawDraft(draft: BylawDraft): boolean {
  return defaultStorage.save(draft);
}

export function clearBylawDraft(): boolean {
  return defaultStorage.clear();
}

export { createEmptyBylawDraft, createEmptyBylawForm } from "./build-template";
