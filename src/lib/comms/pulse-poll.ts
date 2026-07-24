/** FUTURE-006 — local-first pulse poll draft (authoring only). */

export const PULSE_POLL_STORAGE_KEY = "unionops-pulse-poll-draft";

export interface PulsePollQuestion {
  id: string;
  text: string;
}

export interface PulsePollDraft {
  title: string;
  intro: string;
  questions: PulsePollQuestion[];
  slug: string;
  includeBranding: boolean;
  primaryColor: string;
  secondaryColor: string;
}

export function createEmptyPulsePollDraft(
  colors: { primaryColor: string; secondaryColor: string },
): PulsePollDraft {
  return {
    title: "",
    intro: "",
    questions: [{ id: `q-${Date.now()}`, text: "" }],
    slug: "member-pulse",
    includeBranding: false,
    primaryColor: colors.primaryColor,
    secondaryColor: colors.secondaryColor,
  };
}

export function loadPulsePollDraft(): PulsePollDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PULSE_POLL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PulsePollDraft;
    if (!parsed || !Array.isArray(parsed.questions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePulsePollDraft(draft: PulsePollDraft): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(PULSE_POLL_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function sanitizePollSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}
