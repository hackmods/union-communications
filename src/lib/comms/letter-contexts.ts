/**
 * Letter Generator topic contexts — shared formal-letter engine presets.
 * Utilities keep domain worksheets and quick scripts; they may hand off
 * body text into Letter Generator for Brand Kit letterhead DOCX output.
 */

import type { OfficePresetId } from "@/lib/constants/office-templates";
import { letterGeneratorPresetHref } from "@/lib/constants/document-generator-links";

export const LETTER_HANDOFF_STORAGE_KEY = "unionops-letter-handoff-v1";

export type LetterContextId =
  | "general"
  | "welcome"
  | "letterhead"
  | "accommodation"
  | "grievance"
  | "representation"
  | "meetingFollowUp";

export type LetterHandoff = {
  context: LetterContextId;
  fields: Record<string, string>;
  /** Utility slug that produced the handoff (for analytics-free UX copy). */
  source?: string;
};

export const LETTER_CONTEXT_PRESETS: Record<
  LetterContextId,
  OfficePresetId
> = {
  general: "simple-letter",
  welcome: "welcome-letter",
  letterhead: "letterhead",
  accommodation: "accommodation-letter",
  grievance: "grievance-notice",
  representation: "representation-request",
  meetingFollowUp: "meeting-follow-up",
};

export function isLetterContextId(value: string): value is LetterContextId {
  return Object.hasOwn(LETTER_CONTEXT_PRESETS, value);
}

export function letterGeneratorContextHref(
  context: LetterContextId,
  options?: { from?: string },
): string {
  const preset = LETTER_CONTEXT_PRESETS[context];
  const base = letterGeneratorPresetHref(
    preset as Parameters<typeof letterGeneratorPresetHref>[0],
  );
  if (!options?.from) return base;
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}from=${encodeURIComponent(options.from)}`;
}

export function saveLetterHandoff(handoff: LetterHandoff): boolean {
  try {
    window.sessionStorage.setItem(
      LETTER_HANDOFF_STORAGE_KEY,
      JSON.stringify(handoff),
    );
    return true;
  } catch {
    return false;
  }
}

export function consumeLetterHandoff(): LetterHandoff | null {
  try {
    const raw = window.sessionStorage.getItem(LETTER_HANDOFF_STORAGE_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(LETTER_HANDOFF_STORAGE_KEY);
    const parsed = JSON.parse(raw) as Partial<LetterHandoff>;
    if (
      typeof parsed.context !== "string" ||
      !isLetterContextId(parsed.context) ||
      !parsed.fields ||
      typeof parsed.fields !== "object"
    ) {
      return null;
    }
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed.fields)) {
      if (typeof value === "string") fields[key] = value;
    }
    return {
      context: parsed.context,
      fields,
      ...(typeof parsed.source === "string" ? { source: parsed.source } : {}),
    };
  } catch {
    return null;
  }
}
