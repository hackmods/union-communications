/**
 * On-device steward quick-log (Hub informal-log remains the shared module).
 */

import {
  clearJsonDraft,
  loadJsonDraft,
  saveJsonDraft,
} from "@/lib/steward-guides/storage";

export const STEWARD_QUICK_LOG_STORAGE_KEY =
  "unionops-steward-quick-log-draft-v1";

export type StewardQuickLogEntry = {
  id: string;
  when: string;
  who: string;
  what: string;
  nextStep: string;
};

export type StewardQuickLogDraft = {
  entries: StewardQuickLogEntry[];
};

export function createEmptyStewardQuickLogDraft(): StewardQuickLogDraft {
  return { entries: [] };
}

export function isStewardQuickLogDraft(v: unknown): v is StewardQuickLogDraft {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  if (!Array.isArray(d.entries)) return false;
  return d.entries.every((row) => {
    if (!row || typeof row !== "object") return false;
    const e = row as Record<string, unknown>;
    return (
      typeof e.id === "string" &&
      typeof e.when === "string" &&
      typeof e.who === "string" &&
      typeof e.what === "string" &&
      typeof e.nextStep === "string"
    );
  });
}

export function loadStewardQuickLogDraft(): StewardQuickLogDraft | null {
  return loadJsonDraft(STEWARD_QUICK_LOG_STORAGE_KEY, isStewardQuickLogDraft);
}

export function saveStewardQuickLogDraft(draft: StewardQuickLogDraft): boolean {
  return saveJsonDraft(STEWARD_QUICK_LOG_STORAGE_KEY, draft);
}

export function clearStewardQuickLogDraft(): boolean {
  return clearJsonDraft(STEWARD_QUICK_LOG_STORAGE_KEY);
}

export function newStewardQuickLogEntry(): StewardQuickLogEntry {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `log-${Date.now()}`,
    when: today,
    who: "",
    what: "",
    nextStep: "",
  };
}
