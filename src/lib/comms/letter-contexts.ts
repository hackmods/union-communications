/**
 * Letter Generator topic contexts — shared formal-letter engine presets.
 * Utilities keep domain worksheets and quick scripts; they may hand off
 * body text into Letter Generator for Brand Kit letterhead DOCX output.
 */

import type { OfficePresetId } from "@/lib/constants/office-templates";
import { letterGeneratorPresetHref } from "@/lib/constants/document-generator-links";

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

/** In-memory only — avoids persisting draft letter fields in browser storage. */
let pendingLetterHandoff: LetterHandoff | null = null;

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
  pendingLetterHandoff = handoff;
  return true;
}

export function consumeLetterHandoff(): LetterHandoff | null {
  const handoff = pendingLetterHandoff;
  pendingLetterHandoff = null;
  if (!handoff) return null;
  if (
    !isLetterContextId(handoff.context) ||
    !handoff.fields ||
    typeof handoff.fields !== "object"
  ) {
    return null;
  }
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(handoff.fields)) {
    if (typeof value === "string") fields[key] = value;
  }
  return {
    context: handoff.context,
    fields,
    ...(typeof handoff.source === "string" ? { source: handoff.source } : {}),
  };
}
