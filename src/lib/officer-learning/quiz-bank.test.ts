import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { OFFICER_LEARNING_MODULES } from "./modules";
import { parseOfficerLearningModule } from "./parse-module";
import type { QuizQuestion } from "./types";

type QuizLocale = "en" | "fr";
const OPTION_IDS = ["A", "B", "C", "D"] as const;
const EXPECTED_QUESTIONS_PER_MODULE = 6;
const MAX_POSITION_SHARE = 0.4;
const MIN_POSITION_SHARE = 0.15;

function modulePath(moduleId: string, locale: QuizLocale): string {
  return locale === "fr"
    ? path.join(process.cwd(), "src/content/officer-learning/fr", `${moduleId}.md`)
    : path.join(process.cwd(), "src/content/officer-learning", `${moduleId}.md`);
}

function loadQuiz(moduleId: string, locale: QuizLocale): QuizQuestion[] {
  const markdown = fs.readFileSync(modulePath(moduleId, locale), "utf8");
  return parseOfficerLearningModule(moduleId, markdown).quiz;
}

function loadQuestionSections(moduleId: string, locale: QuizLocale): string[] {
  const markdown = fs.readFileSync(modulePath(moduleId, locale), "utf8");
  const quizStart = markdown.search(/^## (?:Self-Test Quiz|Quiz d'autoévaluation)\s*$/m);
  expect(quizStart, `${moduleId} ${locale} quiz heading`).toBeGreaterThanOrEqual(0);
  return markdown
    .slice(quizStart)
    .split(/^### Question \d+\s*$/m)
    .slice(1);
}

function normalizeStem(stem: string): string {
  return stem
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function answerReferences(explanation: string): string[] {
  return [...explanation.matchAll(/(?:If you picked|If you chose|Si vous avez choisi|l'option|l’option|option)\s+([A-D])\b/gi)]
    .map((match) => match[1].toUpperCase());
}

describe("Officer Learning quiz bank integrity", () => {
  it("contains six complete, well-formed questions per module in both locales", () => {
    expect(OFFICER_LEARNING_MODULES).toHaveLength(17);

    for (const meta of OFFICER_LEARNING_MODULES) {
      const en = loadQuiz(meta.id, "en");
      const fr = loadQuiz(meta.id, "fr");
      expect(en, `${meta.id} EN question count`).toHaveLength(EXPECTED_QUESTIONS_PER_MODULE);
      expect(fr, `${meta.id} FR question count`).toHaveLength(EXPECTED_QUESTIONS_PER_MODULE);
      expect(en.map((question) => question.correctOptionId)).toEqual(
        fr.map((question) => question.correctOptionId),
      );
      const enSections = loadQuestionSections(meta.id, "en");
      const frSections = loadQuestionSections(meta.id, "fr");
      expect(enSections, `${meta.id} EN authored question count`).toHaveLength(EXPECTED_QUESTIONS_PER_MODULE);
      expect(frSections, `${meta.id} FR authored question count`).toHaveLength(EXPECTED_QUESTIONS_PER_MODULE);

      for (const [index, question] of en.entries()) {
        expect(question.id, `${meta.id} EN Q${index + 1} stable id`).toBe(`q${index + 1}`);
        expect(question.prompt.trim(), `${meta.id} EN Q${index + 1} stem`).not.toBe("");
        expect(question.explanation.trim(), `${meta.id} EN Q${index + 1} feedback`).not.toBe("");
        expect(question.options.map((option) => option.id)).toEqual(OPTION_IDS);
        expect(question.options.every((option) => option.label.trim().length > 0)).toBe(true);
        expect(
          question.options.filter((option) => option.id === question.correctOptionId),
          `${meta.id} EN Q${index + 1} correct option resolves exactly once`,
        ).toHaveLength(1);

        for (const [locale, localizedQuestion, section] of [
          ["en", question, enSections[index]],
          ["fr", fr[index], frSections[index]],
        ] as const) {
          expect(localizedQuestion.id, `${meta.id} ${locale} Q${index + 1} stable id`).toBe(`q${index + 1}`);
          expect(localizedQuestion.prompt.trim(), `${meta.id} ${locale} Q${index + 1} stem`).not.toBe("");
          expect(localizedQuestion.explanation.trim(), `${meta.id} ${locale} Q${index + 1} feedback`).not.toBe("");
          expect(localizedQuestion.options.map((option) => option.id)).toEqual(OPTION_IDS);
          expect(localizedQuestion.options.every((option) => option.label.trim().length > 0)).toBe(true);
          expect(
            localizedQuestion.options.filter((option) => option.id === localizedQuestion.correctOptionId),
            `${meta.id} ${locale} Q${index + 1} correct option resolves exactly once`,
          ).toHaveLength(1);
          expect(section.match(/^\*\*Correct Answer:/gm) ?? []).toHaveLength(1);
          expect(answerReferences(localizedQuestion.explanation)).not.toContain(localizedQuestion.correctOptionId);
        }
      }
    }
  });

  it("keeps authored answer positions balanced across the bank and each quiz", () => {
    const counts: Record<(typeof OPTION_IDS)[number], number> = { A: 0, B: 0, C: 0, D: 0 };
    let total = 0;

    for (const meta of OFFICER_LEARNING_MODULES) {
      const questions = loadQuiz(meta.id, "en");
      const sequence = questions.map((question) => question.correctOptionId);
      const perModule = { A: 0, B: 0, C: 0, D: 0 };

      for (const answer of sequence) {
        counts[answer as keyof typeof counts] += 1;
        perModule[answer as keyof typeof perModule] += 1;
        total += 1;
      }

      expect(Math.max(...Object.values(perModule)), `${meta.id} answer-position skew`).toBeLessThanOrEqual(3);
      expect(sequence.join("")).not.toMatch(/(.)\1\1/);
    }

    for (const option of OPTION_IDS) {
      const share = counts[option] / total;
      expect(counts[option], `${option} is used in the authored bank`).toBeGreaterThan(0);
      expect(share, `${option} minimum share`).toBeGreaterThanOrEqual(MIN_POSITION_SHARE);
      expect(share, `${option} maximum share`).toBeLessThanOrEqual(MAX_POSITION_SHARE);
    }
  });

  it("contains no exact normalized duplicate stems within either locale", () => {
    for (const locale of ["en", "fr"] as const) {
      const seen = new Map<string, string>();
      for (const meta of OFFICER_LEARNING_MODULES) {
        for (const [index, question] of loadQuiz(meta.id, locale).entries()) {
          const normalized = normalizeStem(question.prompt);
          const location = `${meta.id} Q${index + 1}`;
          expect(normalized, `${location} ${locale} stem`).not.toBe("");
          expect(seen.has(normalized), `duplicate ${locale} stem at ${location}; first at ${seen.get(normalized) ?? "unknown"}`).toBe(false);
          seen.set(normalized, location);
        }
      }
    }
  });

  it("uses consistent self-test labels in the English and French UI", () => {
    const en = JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages/en.json"), "utf8"));
    const fr = JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages/fr.json"), "utf8"));
    expect(en.officerLearning.quiz.label).toBe("Self-test");
    expect(fr.officerLearning.quiz.label).toBe("Autoévaluation");
  });
});
