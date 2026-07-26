"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Callout } from "@/components/ui/Callout";
import type {
  CheckinAnswer,
  CheckinPeriodInfo,
  CheckinSchedule,
} from "@/types/checkins";

export function CheckinDetailView({ scheduleId }: { scheduleId: string }) {
  const t = useTranslations("checkins");
  const { data: session } = useSession();
  const [schedule, setSchedule] = useState<CheckinSchedule | null>(null);
  const [period, setPeriod] = useState<CheckinPeriodInfo | null>(null);
  const [answers, setAnswers] = useState<CheckinAnswer[]>([]);
  const [myAnswer, setMyAnswer] = useState<CheckinAnswer | null>(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch(`/api/checkins/${scheduleId}`),
      fetch(`/api/checkins/${scheduleId}/answers`),
    ])
      .then(async ([schedRes, ansRes]) => {
        if (!schedRes.ok) {
          setError(schedRes.status === 404 ? t("notFound") : t("loadError"));
          setSchedule(null);
          return;
        }
        const schedData = (await schedRes.json()) as {
          schedule: CheckinSchedule;
          period: CheckinPeriodInfo | null;
        };
        setSchedule(schedData.schedule);
        setPeriod(schedData.period);

        if (ansRes.ok) {
          const ansData = (await ansRes.json()) as {
            answers: CheckinAnswer[];
            myAnswer: CheckinAnswer | null;
            period: CheckinPeriodInfo | null;
          };
          setAnswers(ansData.answers ?? []);
          setMyAnswer(ansData.myAnswer);
          if (ansData.period) setPeriod(ansData.period);
        }
        setError(null);
      })
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [scheduleId, t]);

  async function load() {
    try {
      const [schedRes, ansRes] = await Promise.all([
        fetch(`/api/checkins/${scheduleId}`),
        fetch(`/api/checkins/${scheduleId}/answers`),
      ]);
      if (!schedRes.ok) {
        setError(schedRes.status === 404 ? t("notFound") : t("loadError"));
        setSchedule(null);
        return;
      }
      const schedData = (await schedRes.json()) as {
        schedule: CheckinSchedule;
        period: CheckinPeriodInfo | null;
      };
      setSchedule(schedData.schedule);
      setPeriod(schedData.period);

      if (ansRes.ok) {
        const ansData = (await ansRes.json()) as {
          answers: CheckinAnswer[];
          myAnswer: CheckinAnswer | null;
          period: CheckinPeriodInfo | null;
        };
        setAnswers(ansData.answers ?? []);
        setMyAnswer(ansData.myAnswer);
        if (ansData.period) setPeriod(ansData.period);
      }
      setError(null);
    } catch {
      setError(t("loadError"));
    }
  }

  async function handleAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user || !body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/checkins/${scheduleId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (res.status === 409) {
        setError(t("alreadyAnswered"));
        await load();
        return;
      }
      if (!res.ok) {
        setError(t("answerError"));
        return;
      }
      setBody("");
      await load();
    } catch {
      setError(t("answerError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-600">{t("loading")}</p>;
  }

  if (!schedule) {
    return (
      <div>
        <Callout tone="danger">{error ?? t("notFound")}</Callout>
        <Link
          href="/app/checkins"
          className="mt-4 inline-block text-sm text-opseu-blue underline"
        >
          {t("backToList")}
        </Link>
      </div>
    );
  }

  const canAnswer =
    schedule.active && period != null && myAnswer == null;

  return (
    <div>
      <Link
        href="/app/checkins"
        className="text-sm text-opseu-blue underline"
      >
        {t("backToList")}
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-opseu-dark sm:text-3xl">
        {schedule.question}
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        {t("scheduleMeta", {
          cadence: t(`cadence.${schedule.cadence}`),
          status: schedule.active ? t("statusActive") : t("statusInactive"),
        })}
        {period
          ? ` · ${t("periodLabel", { period: period.periodLabel })}`
          : ` · ${t("noActivePeriod")}`}
      </p>

      {error && (
        <Callout tone="danger" className="mt-4">
          {error}
        </Callout>
      )}

      {canAnswer && (
        <Card density="compact" className="mt-6">
          <CardTitle>{t("yourAnswer")}</CardTitle>
          <form className="mt-3 space-y-3" onSubmit={handleAnswer}>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={4}
              aria-label={t("answerBody")}
            />
            <Button type="submit" disabled={saving || !body.trim()}>
              {saving ? t("saving") : t("submitAnswer")}
            </Button>
          </form>
        </Card>
      )}

      {myAnswer && (
        <Callout className="mt-6">
          <p className="font-medium">{t("youAnswered")}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{myAnswer.body}</p>
        </Callout>
      )}

      <section className="mt-6" aria-labelledby="checkin-answers-heading">
        <h2
          id="checkin-answers-heading"
          className="text-lg font-bold text-opseu-dark"
        >
          {t("answersTitle")}
        </h2>
        {answers.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">{t("answersEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {answers.map((answer) => (
              <li key={answer.id}>
                <Card density="compact">
                  <p className="text-sm font-medium text-gray-800">
                    {answer.authorName}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                    {answer.body}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {new Date(answer.createdAt).toLocaleString()}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
