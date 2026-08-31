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

export function loadBylawDraft(): BylawDraft | null {
  const current = loadJsonDraft(BYLAW_DRAFT_STORAGE_KEY_V2, isBylawDraft);
  if (current) return current;

  const legacy = loadJsonDraft(BYLAW_DRAFT_STORAGE_KEY_V1, isBylawFormValues);
  return legacy ? migrateV1ToDraft(legacy) : null;
}

export function saveBylawDraft(draft: BylawDraft): boolean {
  return saveJsonDraft(BYLAW_DRAFT_STORAGE_KEY_V2, draft);
}

export function clearBylawDraft(): boolean {
  clearJsonDraft(BYLAW_DRAFT_STORAGE_KEY_V1);
  return clearJsonDraft(BYLAW_DRAFT_STORAGE_KEY_V2);
}

export { createEmptyBylawDraft, createEmptyBylawForm } from "./build-template";
