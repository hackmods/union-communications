import {
  clearJsonDraft,
  loadJsonDraft,
  saveJsonDraft,
} from "@/lib/steward-guides/storage";
import {
  createEmptyBylawForm,
  isBylawFormValues,
  type BylawFormValues,
} from "./build-template";

const BYLAW_DRAFT_STORAGE_KEY = "unionops.bylaw-builder.draft.v1";

export function loadBylawDraft(): BylawFormValues | null {
  return loadJsonDraft(BYLAW_DRAFT_STORAGE_KEY, isBylawFormValues);
}

export function saveBylawDraft(draft: BylawFormValues): boolean {
  return saveJsonDraft(BYLAW_DRAFT_STORAGE_KEY, draft);
}

export function clearBylawDraft(): boolean {
  return clearJsonDraft(BYLAW_DRAFT_STORAGE_KEY);
}

export { createEmptyBylawForm };
