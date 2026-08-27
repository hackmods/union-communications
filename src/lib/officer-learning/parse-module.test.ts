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
  expect(parsed.quiz.length).toBeGreaterThanOrEqual(3);
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
});
