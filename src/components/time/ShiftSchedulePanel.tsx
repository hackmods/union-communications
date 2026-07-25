"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { TimeCategory, TimeShift, TimeWorker } from "@/types/time";

const CATEGORIES: TimeCategory[] = [
  "staff",
  "release",
  "duty_bank",
  "action",
  "volunteer",
];

function toIsoLocal(value: string): string {
  return new Date(value).toISOString();
}

export function ShiftSchedulePanel({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("time");
  const { data: session } = useSession();
  const [shifts, setShifts] = useState<TimeShift[]>([]);
  const [workers, setWorkers] = useState<TimeWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [label, setLabel] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [category, setCategory] = useState<TimeCategory>("staff");
  const [assigneeId, setAssigneeId] = useState("");

  const reload = useCallback(async () => {
    const [shiftsRes, workersRes] = await Promise.all([
      fetch("/api/time/shifts"),
      isAdmin ? fetch("/api/time/workers") : Promise.resolve(null),
    ]);
    if (!shiftsRes.ok) {
      setError(t("shiftsLoadError"));
      return;
    }
    const data = (await shiftsRes.json()) as { shifts: TimeShift[] };
    setShifts(data.shifts);
    if (workersRes?.ok) {
      const w = (await workersRes.json()) as { workers: TimeWorker[] };
      setWorkers(w.workers.filter((row) => row.active));
    }
    setError(null);
  }, [isAdmin, t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function handleCreate(publish: boolean) {
    if (!label.trim() || !start || !end) {
      setError(t("shiftsValidationError"));
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const assigned =
        assigneeId ||
        session?.user?.id ||
        workers[0]?.id ||
        "";
      const res = await fetch("/api/time/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          startsAt: toIsoLocal(start),
          endsAt: toIsoLocal(end),
          category,
          assignedWorkerIds: assigned ? [assigned] : [],
          status: publish ? "published" : "draft",
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? t("shiftsCreateError"));
        return;
      }
      setLabel("");
      setStart("");
      setEnd("");
      setAssigneeId("");
      await reload();
    } finally {
      setWorking(false);
    }
  }

  async function patchShift(
    id: string,
    body: { status?: "published" | "cancelled" },
  ) {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(`/api/time/shifts/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(t("shiftsActionError"));
        return;
      }
      await reload();
    } finally {
      setWorking(false);
    }
  }

  const upcoming = shifts.filter((s) => s.status !== "cancelled");

  return (
    <Card className="mt-6" density="compact">
      <CardTitle>{isAdmin ? t("shiftsAdminTitle") : t("shiftsTitle")}</CardTitle>
      <p className="mt-1 text-sm text-gray-600">
        {isAdmin ? t("shiftsAdminHint") : t("shiftsHint")}
      </p>

      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {isAdmin ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label={t("shiftsLabel")}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <Input
            label={t("start")}
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <Input
            label={t("end")}
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <Select
            label={t("category")}
            value={category}
            onChange={(e) => setCategory(e.target.value as TimeCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`categories.${c}`)}
              </option>
            ))}
          </Select>
          <Select
            label={t("shiftsAssignee")}
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">{t("shiftsAssigneeSelf")}</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.displayName}
              </option>
            ))}
          </Select>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button
              onClick={() => void handleCreate(false)}
              disabled={working}
              variant="secondary"
            >
              {t("shiftsSaveDraft")}
            </Button>
            <Button onClick={() => void handleCreate(true)} disabled={working}>
              {t("shiftsPublish")}
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-3 text-sm text-gray-500">{t("loading")}</p>
      ) : upcoming.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">{t("shiftsEmpty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {upcoming.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{s.label}</p>
                <p className="text-sm text-gray-600">
                  {new Date(s.startsAt).toLocaleString()} –{" "}
                  {new Date(s.endsAt).toLocaleString()} ·{" "}
                  {t(`categories.${s.category}`)} · {t(`shiftsStatus.${s.status}`)}
                </p>
                <p className="text-xs text-gray-500">
                  {t("shiftsAssignedCount", {
                    count: s.assignedWorkerIds.length,
                  })}
                </p>
              </div>
              {isAdmin ? (
                <div className="flex flex-wrap gap-2">
                  {s.status === "draft" ? (
                    <Button
                      size="sm"
                      disabled={working}
                      onClick={() =>
                        void patchShift(s.id, { status: "published" })
                      }
                    >
                      {t("shiftsPublish")}
                    </Button>
                  ) : null}
                  {s.status !== "cancelled" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={working}
                      onClick={() =>
                        void patchShift(s.id, { status: "cancelled" })
                      }
                    >
                      {t("shiftsCancel")}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
