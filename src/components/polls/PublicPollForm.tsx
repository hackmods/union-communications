"use client";

import { useState, type FormEvent } from "react";
import type { PollDefinition, PollQuestion } from "@/types/polls";

function emptyAnswers(questions: PollQuestion[]): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const q of questions) {
    initial[q.id] = "";
  }
  return initial;
}

export function PublicPollForm({
  poll,
  labels,
}: {
  poll: PollDefinition;
  labels: {
    intro?: string;
    consent: string;
    submit: string;
    submitting: string;
    success: string;
    closed: string;
    error: string;
    required: string;
    freeTextPlaceholder: string;
  };
}) {
  const [answers, setAnswers] = useState(() => emptyAnswers(poll.questions));
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (poll.status !== "open") {
    return (
      <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
        {labels.closed}
      </p>
    );
  }

  if (done) {
    return (
      <p
        className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900"
        role="status"
      >
        {labels.success}
      </p>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    for (const q of poll.questions) {
      if (!answers[q.id]?.trim()) {
        setError(labels.required);
        return;
      }
    }
    if (poll.consentRequired && !consent) {
      setError(labels.required);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/polls/${poll.slug}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          consentAccepted: poll.consentRequired ? consent : true,
        }),
      });
      if (!res.ok) {
        throw new Error("fail");
      }
      setDone(true);
    } catch {
      setError(labels.error);
    } finally {
      setSubmitting(false);
    }
  }

  function renderQuestion(q: PollQuestion, index: number) {
    if (q.type === "single_choice") {
      return (
        <fieldset key={q.id} className="space-y-2">
          <legend className="text-sm font-medium text-gray-900">
            {index + 1}. {q.text}
          </legend>
          <div className="space-y-2">
            {(q.options ?? []).map((opt) => (
              <label
                key={opt}
                className="flex min-h-11 items-center gap-2 text-sm text-gray-800"
              >
                <input
                  type="radio"
                  name={q.id}
                  value={opt}
                  checked={answers[q.id] === opt}
                  onChange={() =>
                    setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                  }
                />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>
      );
    }
    return (
      <div key={q.id} className="space-y-2">
        <label
          htmlFor={q.id}
          className="block text-sm font-medium text-gray-900"
        >
          {index + 1}. {q.text}
        </label>
        <textarea
          id={q.id}
          className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder={labels.freeTextPlaceholder}
          value={answers[q.id] ?? ""}
          onChange={(e) =>
            setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
          }
        />
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
      {poll.intro && (
        <p className="text-sm text-gray-700">{poll.intro}</p>
      )}
      <div className="space-y-5">
        {poll.questions.map((q, i) => renderQuestion(q, i))}
      </div>
      {poll.consentRequired && (
        <label className="flex min-h-11 items-start gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            className="mt-1"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>{labels.consent}</span>
        </label>
      )}
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-opseu-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {submitting ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
