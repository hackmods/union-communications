/**
 * Dependency-free English readability helpers (COPY-005).
 *
 * Flesch–Kincaid Grade Level is a ranking signal for dense EN catalog leaves —
 * not an authoritative school-grade contract. French is out of scope.
 */

import {
  type CopyLeaf,
  hubLeaves,
  publicLeaves,
  wordCount,
} from "./copy-namespaces";

/** Minimum words before a leaf is scored (short labels score meaninglessly). */
export const READABILITY_MIN_WORDS = 8;

export type ReadabilityScore = {
  path: string;
  value: string;
  words: number;
  sentences: number;
  syllables: number;
  /** Flesch–Kincaid Grade Level (higher = harder). */
  grade: number;
};

/** Strip ICU / caption placeholders so tokens do not dominate syllable counts. */
export function stripTemplateTokens(text: string): string {
  return text
    .replace(/\{[^}]+\}/g, " ")
    .replace(/#[A-Za-z][\w-]*/g, " ")
    .replace(/\[[^\]]+\]/g, " ");
}

/** Vowel-group syllable estimate; clamp to ≥1 per word. */
export function countSyllables(word: string): number {
  const cleaned = word
    .toLowerCase()
    .replace(/[^a-z']/g, "")
    .replace(/'/g, "");
  if (!cleaned) return 0;
  // Silent trailing e (make, like) — crude but stable for ranking.
  let w = cleaned.replace(/e$/i, "");
  if (!w) w = cleaned;
  const groups = w.match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 1);
}

function tokenizeWords(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ""))
    .filter(Boolean);
}

/**
 * Sentence count for FK. Terminator-less UI strings count as one sentence
 * so ASL (words/sentences) does not explode.
 */
export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const parts = trimmed.split(/[.!?]+/).map((p) => p.trim()).filter(Boolean);
  return Math.max(1, parts.length);
}

/**
 * Flesch–Kincaid Grade Level:
 * 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
 */
export function fleschKincaidGrade(text: string): ReadabilityScore | null {
  const cleaned = stripTemplateTokens(text);
  const words = tokenizeWords(cleaned);
  if (words.length === 0) return null;
  const sentences = countSentences(cleaned);
  let syllables = 0;
  for (const w of words) syllables += countSyllables(w);
  const grade =
    0.39 * (words.length / sentences) +
    11.8 * (syllables / words.length) -
    15.59;
  return {
    path: "",
    value: text,
    words: words.length,
    sentences,
    syllables,
    grade,
  };
}

export function scoreLeaf(
  path: string,
  value: string,
  minWords = READABILITY_MIN_WORDS,
): ReadabilityScore | null {
  if (wordCount(value) <= minWords) return null;
  const scored = fleschKincaidGrade(value);
  if (!scored) return null;
  return { ...scored, path, value };
}

export function rankHardest(
  leaves: readonly CopyLeaf[],
  limit = 20,
  minWords = READABILITY_MIN_WORDS,
): ReadabilityScore[] {
  const scored: ReadabilityScore[] = [];
  for (const [path, value] of leaves) {
    const row = scoreLeaf(path, value, minWords);
    if (row) scored.push(row);
  }
  scored.sort((a, b) => b.grade - a.grade || a.path.localeCompare(b.path));
  return scored.slice(0, limit);
}

export function rankPublicAndHub(
  catalog: Record<string, unknown>,
  limit = 20,
): { public: ReadabilityScore[]; hub: ReadabilityScore[] } {
  return {
    public: rankHardest(publicLeaves(catalog), limit),
    hub: rankHardest(hubLeaves(catalog), limit),
  };
}

export function formatReadabilityReport(
  rows: readonly ReadabilityScore[],
): string {
  return rows
    .map(
      (r, i) =>
        `${String(i + 1).padStart(2, " ")}. grade ${r.grade.toFixed(1)}  ${r.path}\n    ${r.value}`,
    )
    .join("\n");
}
