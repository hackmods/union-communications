import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseOfficerLearningModule } from "./parse-module";
import { OFFICER_LEARNING_MODULES } from "./modules";

/**
 * Catches Module-8-class claim bugs: quiz prompt names one legal term while
 * the correct option / explanation quietly teaches its sibling.
 * Also guards FR quiz voice (*Explication*) and floor checklist length.
 */
const LEGAL_TERM_PAIRS: Array<{
  id: string;
  prompt: RegExp;
  forbiddenInAnswer: RegExp;
  allowedInAnswer: RegExp;
}> = [
  {
    id: "without-precedent",
    prompt: /\bwithout\s+precedent\b|sans\s+précédent/i,
    forbiddenInAnswer: /\bwithout\s+prejudice\b|sans\s+préjudice/i,
    allowedInAnswer: /\bwithout\s+precedent\b|sans\s+précédent|précédent|precedent/i,
  },
  {
    id: "without-prejudice",
    prompt: /\bwithout\s+prejudice\b|sans\s+préjudice/i,
    forbiddenInAnswer: /\bwithout\s+precedent\b|sans\s+précédent/i,
    allowedInAnswer: /\bwithout\s+prejudice\b|sans\s+préjudice|préjudice|prejudice/i,
  },
];

function loadModule(id: string, locale: "en" | "fr"): string {
  const file =
    locale === "en"
      ? path.join(process.cwd(), "src/content/officer-learning", `${id}.md`)
      : path.join(process.cwd(), "src/content/officer-learning/fr", `${id}.md`);
  return fs.readFileSync(file, "utf-8");
}

describe("officer learning claim-chain guards", () => {
  it("keeps prejudice/precedent prompt↔answer↔explanation aligned", () => {
    for (const meta of OFFICER_LEARNING_MODULES) {
      for (const locale of ["en", "fr"] as const) {
        const parsed = parseOfficerLearningModule(meta.id, loadModule(meta.id, locale));
        for (const question of parsed.quiz) {
          const correct = question.options.find((o) => o.id === question.correctOptionId);
          expect(correct, `${meta.id} ${locale} ${question.id}`).toBeTruthy();
          const answerBlob = `${correct?.label ?? ""}\n${question.explanation}`;
          for (const pair of LEGAL_TERM_PAIRS) {
            if (!pair.prompt.test(question.prompt)) continue;
            expect(
              pair.forbiddenInAnswer.test(answerBlob) &&
                !pair.allowedInAnswer.test(answerBlob),
              `${meta.id} ${locale} ${question.id}: prompt names ${pair.id} but answer/explanation swapped to the sibling term`,
            ).toBe(false);
            // If the forbidden sibling appears as the only label in the explanation opener, fail hard
            if (pair.forbiddenInAnswer.test(question.explanation)) {
              expect(
                pair.allowedInAnswer.test(question.explanation),
                `${meta.id} ${locale} ${question.id}: explanation uses sibling of ${pair.id} without the prompted term`,
              ).toBe(true);
            }
          }
        }
      }
    }
  });

  it("uses French *Explication* quiz labels (not English *Explanation*)", () => {
    for (const meta of OFFICER_LEARNING_MODULES) {
      const md = loadModule(meta.id, "fr");
      expect(
        md.includes("*Explanation*"),
        `${meta.id} FR still has *Explanation* quiz labels`,
      ).toBe(false);
      expect(md.includes("*Explication*"), `${meta.id} FR missing *Explication*`).toBe(
        true,
      );
    }
  });

  it("keeps every module floor checklist at ≥10 actionable items", () => {
    for (const meta of OFFICER_LEARNING_MODULES) {
      for (const locale of ["en", "fr"] as const) {
        const md = loadModule(meta.id, locale);
        const items = md.match(/^- \[[ xX]\] .+$/gm) ?? [];
        // Prefer the Floor checklist section when present; else all tick items
        const floorIdx = md.search(/^##\s+(Floor checklist|Liste de contrôle)/im);
        const slice = floorIdx >= 0 ? md.slice(floorIdx) : md;
        const quizIdx = slice.search(/^##\s+.*(Quiz|autoévaluation)/im);
        const floorBody = quizIdx >= 0 ? slice.slice(0, quizIdx) : slice;
        const floorItems = floorBody.match(/^- \[[ xX]\] .+$/gm) ?? items;
        expect(
          floorItems.length,
          `${meta.id} ${locale} floor checklist has ${floorItems.length} items (need ≥10)`,
        ).toBeGreaterThanOrEqual(10);
      }
    }
  });
});
