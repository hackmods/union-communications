"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Callout } from "@/components/ui/Callout";
import { canManageCheckins } from "@/lib/checkins/access";
import type {
  CheckinPendingItem,
  CheckinSchedule,
} from "@/types/checkins";
import type { UserRole } from "@/types/tenant";

export function CheckinsBoard() {
  const t = useTranslations("checkins");
  const { data: session } = useSession();
  const roles = (session?.user?.roles ?? []) as UserRole[];
  const canManage = canManageCheckins(roles);

  const [schedules, setSchedules] = useState<CheckinSchedule[]>([]);
  const [pending, setPending] = useState<CheckinPendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [cadence, setCadence] = useState<"daily" | "weekdays" | "weekly">(
    "weekly",
  );
  const [weekday, setWeekday] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetch("/api/checkins"),
      fetch("/api/checkins/mine?unanswered=1"),
    ])
      .then(async ([listRes, mineRes]) => {
        if (!listRes.ok || !mineRes.ok) {
          setError(t("loadError"));
          return;
        }
        const listData = (await listRes.json()) as {
          schedules: CheckinSchedule[];
        };
        const mineData = (await mineRes.json()) as {
          pending: CheckinPendingItem[];
        };
        setSchedules(listData.schedules ?? []);
        setPending(mineData.pending ?? []);
        setError(null);
      })
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  async function load() {
    try {
      const [listRes, mineRes] = await Promise.all([
        fetch("/api/checkins"),
        fetch("/api/checkins/mine?unanswered=1"),
      ]);
      if (!listRes.ok || !mineRes.ok) {
        setError(t("loadError"));
        return;
      }
      const listData = (await listRes.json()) as {
        schedules: CheckinSchedule[];
      };
      const mineData = (await mineRes.json()) as {
        pending: CheckinPendingItem[];
      };
      setSchedules(listData.schedules ?? []);
      setPending(mineData.pending ?? []);
      setError(null);
    } catch {
      setError(t("loadError"));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          cadence,
          weekday: cadence === "weekly" ? weekday : undefined,
          bargainingUnitId: session.user.bargainingUnitId,
        }),
      });
      if (!res.ok) {
        setError(t("createError"));
        return;
      }
      setQuestion("");
      setShowForm(false);
      await load();
    } catch {
      setError(t("createError"));
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    setError(null);
    const res = await fetch(`/api/checkins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    if (!res.ok) {
      setError(t("updateError"));
      return;
    }
    await load();
  }

  if (loading) {
    return <p className="text-sm text-gray-600">{t("loading")}</p>;
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-opseu-dark sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-gray-600 sm:text-base">
            {t("subtitle")}
          </p>
        </div>
        {canManage && (
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? t("cancel") : t("newSchedule")}
          </Button>
        )}
      </div>

      {error && (
        <Callout tone="danger" className="mt-4">
          {error}
        </Callout>
      )}

      {pending.length > 0 && (
        <section className="mt-6" aria-labelledby="checkins-pending-heading">
          <h2
            id="checkins-pending-heading"
            className="text-lg font-bold text-opseu-dark"
          >
            {t("pendingTitle")}
          </h2>
          <ul className="mt-3 space-y-2">
            {pending.map((item) => (
              <li key={item.schedule.id}>
                <Card density="compact">
                  <CardTitle className="text-base">
                    {item.schedule.question}
                  </CardTitle>
                  <p className="mt-1 text-sm text-gray-600">
                    {t("periodLabel", { period: item.periodLabel })}
                  </p>
                  <Link
                    href={`/app/checkins/${item.schedule.id}`}
                    className="mt-2 inline-block text-sm font-medium text-opseu-blue underline"
                  >
                    {t("answerNow")}
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canManage && showForm && (
        <Card density="compact" className="mt-6">
          <CardTitle>{t("newSchedule")}</CardTitle>
          <form className="mt-3 space-y-3" onSubmit={handleCreate}>
            <div>
              <label
                htmlFor="checkin-question"
                className="text-sm font-medium text-gray-700"
              >
                {t("questionLabel")}
              </label>
              <Textarea
                id="checkin-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="checkin-cadence"
                className="text-sm font-medium text-gray-700"
              >
                {t("cadenceLabel")}
              </label>
              <select
                id="checkin-cadence"
                className="mt-1 min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={cadence}
                onChange={(e) =>
                  setCadence(e.target.value as typeof cadence)
                }
              >
                <option value="daily">{t("cadenceDaily")}</option>
                <option value="weekdays">{t("cadenceWeekdays")}</option>
                <option value="weekly">{t("cadenceWeekly")}</option>
              </select>
            </div>
            {cadence === "weekly" && (
              <div>
                <label
                  htmlFor="checkin-weekday"
                  className="text-sm font-medium text-gray-700"
                >
                  {t("weekdayLabel")}
                </label>
                <select
                  id="checkin-weekday"
                  className="mt-1 min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={weekday}
                  onChange={(e) => setWeekday(Number(e.target.value))}
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                    <option key={d} value={d}>
                      {t(`weekday.${d}`)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button type="submit" disabled={saving || !question.trim()}>
              {saving ? t("saving") : t("create")}
            </Button>
          </form>
        </Card>
      )}

      <section className="mt-6" aria-labelledby="checkins-all-heading">
        <h2
          id="checkins-all-heading"
          className="text-lg font-bold text-opseu-dark"
        >
          {t("allSchedules")}
        </h2>
        {schedules.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">{t("empty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {schedules.map((schedule) => (
              <li key={schedule.id}>
                <Card density="compact">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {schedule.question}
                      </CardTitle>
                      <p className="mt-1 text-sm text-gray-600">
                        {t("scheduleMeta", {
                          cadence: t(`cadence.${schedule.cadence}`),
                          status: schedule.active
                            ? t("statusActive")
                            : t("statusInactive"),
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/app/checkins/${schedule.id}`}
                        className="inline-flex min-h-11 items-center rounded-md border border-gray-300 px-3 text-sm hover:bg-gray-50"
                      >
                        {t("open")}
                      </Link>
                      {canManage && schedule.active && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void deactivate(schedule.id)}
                        >
                          {t("deactivate")}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
