import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseOfficerLearningModule } from "./parse-module";
import { OFFICER_LEARNING_MODULES } from "./modules";

function assertParsedModule(
  id: string,
  number: number,
  markdown: string,
): void {
  const parsed = parseOfficerLearningModule(id, markdown);
  expect(parsed.number).toBe(number);
  expect(parsed.title.length).toBeGreaterThan(0);
  expect(parsed.purpose.length).toBeGreaterThan(0);
  expect(parsed.objectives.length).toBeGreaterThanOrEqual(3);
  expect(parsed.sections.length).toBeGreaterThanOrEqual(8);
  expect(parsed.quiz.length).toBeGreaterThanOrEqual(6);
  for (const question of parsed.quiz) {
    expect(question.options.length).toBeGreaterThanOrEqual(4);
    expect(question.correctOptionId).toMatch(/^[A-D]$/);
    expect(question.explanation.length).toBeGreaterThan(0);
  }
}

describe("parseOfficerLearningModule", () => {
  it("parses all six English module markdown files with quiz questions", () => {
    for (const meta of OFFICER_LEARNING_MODULES) {
      const markdown = fs.readFileSync(
        path.join(process.cwd(), "src/content/officer-learning", `${meta.id}.md`),
        "utf-8",
      );
      assertParsedModule(meta.id, meta.number, markdown);
    }
  });

  it("parses all six French module markdown files with quiz questions", () => {
    for (const meta of OFFICER_LEARNING_MODULES) {
      const markdown = fs.readFileSync(
        path.join(
          process.cwd(),
          "src/content/officer-learning/fr",
          `${meta.id}.md`,
        ),
        "utf-8",
      );
      assertParsedModule(meta.id, meta.number, markdown);
    }
  });

  it("keeps EN/FR quiz answer letters aligned", () => {
    for (const meta of OFFICER_LEARNING_MODULES) {
      const en = parseOfficerLearningModule(
        meta.id,
        fs.readFileSync(
          path.join(process.cwd(), "src/content/officer-learning", `${meta.id}.md`),
          "utf-8",
        ),
      );
      const fr = parseOfficerLearningModule(
        meta.id,
        fs.readFileSync(
          path.join(
            process.cwd(),
            "src/content/officer-learning/fr",
            `${meta.id}.md`,
          ),
          "utf-8",
        ),
      );
      expect(fr.quiz.map((q) => q.correctOptionId)).toEqual(
        en.quiz.map((q) => q.correctOptionId),
      );
      expect(fr.quiz.length).toBe(en.quiz.length);
    }
  });

  it("classifies French callout prefixes and quiz explanations", () => {
    const markdown = `# Module 4: Gouvernance

## Objectif général
Équiper le président.

## Objectifs d'apprentissage
*   **Know**: One
*   **Feel**: Two
*   **Be Able To**: Three

## Section One
Avertissement: rester calme.

Exercice: essayer ceci.

Réflexion: y penser.

## Quiz d'autoévaluation
### Question 1
Quelle est la première étape?
*   A) Écouter
*   B) Parler
*   C) Voter
*   D) Ajourner
**Correct Answer: A**
*Explication*: commencer par écouter.
`;
    const parsed = parseOfficerLearningModule("module-4", markdown);
    const callouts = parsed.sections
      .flatMap((s) => s.blocks)
      .filter((b) => b.type === "callout");
    expect(callouts.map((b) => (b.type === "callout" ? b.variant : null))).toEqual(
      ["warning", "practice", "reflection"],
    );
    expect(callouts[0]?.type === "callout" && callouts[0].text).toBe(
      "rester calme.",
    );
    expect(parsed.quiz[0]?.explanation).toContain("commencer par écouter");
  });

  it("parses floor checklist task items as checklist blocks", () => {
    const markdown = fs.readFileSync(
      path.join(process.cwd(), "src/content/officer-learning", "module-1.md"),
      "utf-8",
    );
    const parsed = parseOfficerLearningModule("module-1", markdown);
    const checklist = parsed.sections
      .flatMap((s) => s.blocks)
      .find((b) => b.type === "checklist");
    expect(checklist?.type).toBe("checklist");
    if (checklist?.type === "checklist") {
      expect(checklist.items.length).toBeGreaterThanOrEqual(6);
    }
  });
});
