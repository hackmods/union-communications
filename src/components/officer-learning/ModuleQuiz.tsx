"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { QuizQuestion } from "@/lib/officer-learning/types";
import { markQuizPassed } from "@/lib/officer-learning/progress";
import { resetQuizState } from "@/lib/officer-learning/quiz-state";
import { scrollQuizIntoView } from "@/lib/officer-learning/quiz-scroll";
import { maybePushHubProgressAfterPass } from "@/lib/officer-learning/hub-sync-client";
import { olTheme } from "@/lib/officer-learning/theme";
import { Link } from "@/i18n/navigation";
import { CertificateDownload } from "./CertificateDownload";
import clsx from "clsx";

const RESET_FADE_MS = 220;

type Props = {
  moduleId: string;
  moduleNumber: number;
  moduleTitle: string;
  questions: QuizQuestion[];
  nextModuleSlug: string | null;
  quizPassed?: boolean;
  onCompleted?: () => void;
};

type AnswerState = Record<string, string>;

export function ModuleQuiz({
  moduleId,
  moduleNumber,
  moduleTitle,
  questions,
  nextModuleSlug,
  quizPassed = false,
  onCompleted,
}: Props) {
  const t = useTranslations("officerLearning");
  const sectionRef = useRef<HTMLElement>(null);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [submitted, setSubmitted] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [retestHint, setRetestHint] = useState(false);

  const showResults = submitted || isExiting;
  const inputsLocked = showResults && !isExiting;

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
    setRetestHint(false);
    if (questions.every((q) => answers[q.id] === q.correctOptionId)) {
      markQuizPassed(moduleId);
      setCelebrate(true);
      onCompleted?.();
      void maybePushHubProgressAfterPass();
    }
  };

  const handleRetest = () => {
    if (isExiting) return;
    setIsExiting(true);
    window.setTimeout(() => {
      const next = resetQuizState();
      setAnswers(next.answers);
      setSubmitted(next.submitted);
      setCelebrate(false);
      setIsExiting(false);
      setRetestHint(true);
      scrollQuizIntoView(sectionRef.current);
    }, RESET_FADE_MS);
  };

  return (
    <section
      ref={sectionRef}
      id="module-quiz"
      className={clsx(
        olTheme.panelQuiz,
        celebrate && !isExiting && "scale-[1.01] ring-2 ring-emerald-400/40",
      )}
    >
      <div aria-live="polite" className="sr-only">
        {retestHint && t("quiz.retestReady")}
        {submitted && !isExiting && (passed ? t("quiz.passed") : t("quiz.retry"))}
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={olTheme.eyebrow}>{t("quiz.label")}</p>
          <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">{t("quiz.title")}</h2>
        </div>
        <div
          className={clsx(
            "min-h-8 transition-opacity duration-200",
            showResults && !isExiting ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={!showResults || isExiting}
        >
          <p className="rounded-full bg-white/10 px-4 py-1 text-sm font-medium text-white">
            {t("quiz.score", { score, total: questions.length })}
          </p>
        </div>
      </div>

      {quizPassed && !submitted && !isExiting && (
        <div className="mb-6 space-y-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
          <p className="font-semibold text-emerald-100">{t("quiz.alreadyPassed")}</p>
          <CertificateDownload
            kind="module"
            achievementTitle={moduleTitle}
            moduleNumber={moduleNumber}
          />
        </div>
      )}

      {retestHint && !submitted && (
        <p className={olTheme.hintPanel}>{t("quiz.retestReady")}</p>
      )}

      <div
        className={clsx(
          "space-y-8 transition-opacity duration-200",
          isExiting && "opacity-40",
        )}
      >
        {questions.map((question, index) => {
          const selected = answers[question.id];
          const isCorrect = showResults && selected === question.correctOptionId;
          const isIncorrect =
            showResults && selected && selected !== question.correctOptionId;

          return (
            <fieldset key={question.id} className="space-y-3">
              <legend className="text-lg font-semibold text-white">
                {index + 1}. {question.prompt}
              </legend>
              <div className="space-y-2">
                {question.options.map((option) => {
                  const chosen = selected === option.id;
                  const showCorrect =
                    showResults && option.id === question.correctOptionId;
                  const showWrong =
                    showResults && chosen && option.id !== question.correctOptionId;

                  return (
                    <label
                      key={option.id}
                      className={clsx(
                        "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
                        !inputsLocked && chosen && olTheme.optionSelected,
                        !inputsLocked && !chosen && olTheme.optionHover,
                        showCorrect && "border-emerald-400 bg-emerald-500/15",
                        showWrong && "border-red-400 bg-red-500/15",
                        inputsLocked && !showCorrect && !showWrong && "opacity-70",
                      )}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.id}
                        checked={chosen}
                        disabled={inputsLocked}
                        onChange={() =>
                          setAnswers((prev) => ({ ...prev, [question.id]: option.id }))
                        }
                        className={clsx("mt-1 h-4 w-4", olTheme.inputAccent)}
                      />
                      <span className="text-slate-100">
                        <span className={olTheme.optionLabel}>{option.id})</span>
                        {option.label.replace(/<\/?[^>]+(>|$)/g, "")}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div
                className={clsx(
                  "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                  showResults && !isExiting
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  <p
                    className={clsx(
                      "rounded-lg px-4 py-3 text-sm leading-relaxed",
                      isCorrect && "bg-emerald-500/10 text-emerald-100",
                      isIncorrect && "bg-red-500/10 text-red-100",
                    )}
                  >
                    {question.explanation.replace(/<\/?[^>]+(>|$)/g, "")}
                  </p>
                </div>
              </div>
            </fieldset>
          );
        })}
      </div>

      <div
        className={clsx(
          "mt-8 transition-opacity duration-200",
          isExiting && "pointer-events-none opacity-0",
        )}
      >
        {!submitted ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < questions.length || isExiting}
            className={olTheme.btnPrimary}
          >
            {t("quiz.submit")}
          </button>
        ) : passed ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 font-semibold text-emerald-100">
              {t("quiz.passed")}
            </p>
            {!quizPassed && (
              <CertificateDownload
                kind="module"
                achievementTitle={moduleTitle}
                moduleNumber={moduleNumber}
              />
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRetest}
                disabled={isExiting}
                className={olTheme.btnOutline}
              >
                {t("quiz.practiceAgain")}
              </button>
              {nextModuleSlug ? (
                <Link
                  href={`/guide/officer-learning/${nextModuleSlug}`}
                  className={olTheme.btnPrimary}
                >
                  {t("quiz.nextModule")} →
                </Link>
              ) : (
                <Link href="/guide/officer-learning" className={olTheme.btnPrimary}>
                  {t("quiz.backToDashboard")} →
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className={olTheme.retryPanel}>{t("quiz.retry")}</p>
            <button
              type="button"
              onClick={handleRetest}
              disabled={isExiting}
              className={olTheme.btnOutlineRetry}
            >
              {t("quiz.tryAgain")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
