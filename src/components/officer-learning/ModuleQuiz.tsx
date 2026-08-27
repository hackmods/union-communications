"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { QuizQuestion } from "@/lib/officer-learning/types";
import { markQuizPassed } from "@/lib/officer-learning/progress";
import { resetQuizState } from "@/lib/officer-learning/quiz-state";
import { maybePushHubProgressAfterPass } from "@/lib/officer-learning/hub-sync-client";
import { Link } from "@/i18n/navigation";
import { CertificateDownload } from "./CertificateDownload";
import clsx from "clsx";

type Props = {
  moduleId: string;
  moduleNumber: number;
  moduleTitle: string;
  questions: QuizQuestion[];
  nextModuleSlug: string | null;
  onCompleted?: () => void;
};

type AnswerState = Record<string, string>;

export function ModuleQuiz({
  moduleId,
  moduleNumber,
  moduleTitle,
  questions,
  nextModuleSlug,
  onCompleted,
}: Props) {
  const t = useTranslations("officerLearning");
  const [answers, setAnswers] = useState<AnswerState>({});
  const [submitted, setSubmitted] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const score = useMemo(() => {
    if (!submitted) return 0;
    return questions.reduce(
      (acc, question) => acc + (answers[question.id] === question.correctOptionId ? 1 : 0),
      0,
    );
  }, [answers, questions, submitted]);

  const passed = submitted && score === questions.length;

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) return;
    setSubmitted(true);
    if (questions.every((q) => answers[q.id] === q.correctOptionId)) {
      markQuizPassed(moduleId);
      setCelebrate(true);
      onCompleted?.();
      void maybePushHubProgressAfterPass();
    }
  };

  const handleTryAgain = () => {
    const next = resetQuizState();
    setAnswers(next.answers);
    setSubmitted(next.submitted);
  };

  return (
    <section
      id="module-quiz"
      className={clsx(
        "scroll-mt-32 rounded-2xl border border-teal-500/25 bg-slate-900/70 p-6 shadow-xl transition-transform md:p-8",
        celebrate && "scale-[1.01] ring-2 ring-emerald-400/40",
      )}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
            {t("quiz.label")}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">{t("quiz.title")}</h2>
        </div>
        {submitted && (
          <p className="rounded-full bg-white/10 px-4 py-1 text-sm font-medium text-white">
            {t("quiz.score", { score, total: questions.length })}
          </p>
        )}
      </div>

      <div className="space-y-8">
        {questions.map((question, index) => {
          const selected = answers[question.id];
          const isCorrect = submitted && selected === question.correctOptionId;
          const isIncorrect = submitted && selected && selected !== question.correctOptionId;

          return (
            <fieldset key={question.id} className="space-y-3">
              <legend className="text-lg font-semibold text-white">
                {index + 1}. {question.prompt}
              </legend>
              <div className="space-y-2">
                {question.options.map((option) => {
                  const chosen = selected === option.id;
                  const showCorrect = submitted && option.id === question.correctOptionId;
                  const showWrong = submitted && chosen && option.id !== question.correctOptionId;

                  return (
                    <label
                      key={option.id}
                      className={clsx(
                        "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
                        !submitted && chosen && "border-teal-400 bg-teal-500/15",
                        !submitted && !chosen && "border-white/10 bg-white/5 hover:border-teal-400/40",
                        showCorrect && "border-emerald-400 bg-emerald-500/15",
                        showWrong && "border-red-400 bg-red-500/15",
                        submitted && !showCorrect && !showWrong && "opacity-70",
                      )}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.id}
                        checked={chosen}
                        disabled={submitted}
                        onChange={() =>
                          setAnswers((prev) => ({ ...prev, [question.id]: option.id }))
                        }
                        className="mt-1 h-4 w-4 accent-teal-400"
                      />
                      <span className="text-slate-100">
                        <span className="mr-2 font-semibold text-amber-300">{option.id})</span>
                        {option.label.replace(/<\/?[^>]+(>|$)/g, "")}
                      </span>
                    </label>
                  );
                })}
              </div>
              {submitted && (
                <p
                  className={clsx(
                    "rounded-lg px-4 py-3 text-sm leading-relaxed",
                    isCorrect && "bg-emerald-500/10 text-emerald-100",
                    isIncorrect && "bg-red-500/10 text-red-100",
                  )}
                >
                  {question.explanation.replace(/<\/?[^>]+(>|$)/g, "")}
                </p>
              )}
            </fieldset>
          );
        })}
      </div>

      {!submitted ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < questions.length}
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-teal-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("quiz.submit")}
        </button>
      ) : passed ? (
        <div className="mt-8 space-y-4">
          <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 font-semibold text-emerald-100">
            {t("quiz.passed")}
          </p>
          <CertificateDownload
            kind="module"
            achievementTitle={moduleTitle}
            moduleNumber={moduleNumber}
          />
          {nextModuleSlug ? (
            <Link
              href={`/guide/officer-learning/${nextModuleSlug}`}
              className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              {t("quiz.nextModule")} →
            </Link>
          ) : (
            <Link
              href="/guide/officer-learning"
              className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              {t("quiz.backToDashboard")} →
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-amber-100">
            {t("quiz.retry")}
          </p>
          <button
            type="button"
            onClick={handleTryAgain}
            className="inline-flex items-center justify-center rounded-xl border border-amber-400/40 bg-transparent px-6 py-3 font-semibold text-amber-100 transition hover:bg-amber-500/15"
          >
            {t("quiz.tryAgain")}
          </button>
        </div>
      )}
    </section>
  );
}
