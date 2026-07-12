"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { JobCode, TimeCategory, TimeEntry } from "@/types/time";

const CATEGORIES: TimeCategory[] = [
  "staff",
  "release",
  "duty_bank",
  "action",
  "volunteer",
];

function formatDuration(entry: TimeEntry): string {
  const end = entry.clockOutAt ? new Date(entry.clockOutAt) : new Date();
  const ms = end.getTime() - new Date(entry.clockInAt).getTime();
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${mins}m`;
}

function defaultCodeForCategory(
  codes: JobCode[],
  category: TimeCategory,
): string {
  const match = codes.find((c) => c.category === category);
  return match?.id ?? codes[0]?.id ?? "";
}

async function tryGps(): Promise<TimeEntry["clockInGps"] | undefined> {
  if (!navigator.geolocation) return undefined;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
        }),
      () => resolve(undefined),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

export function TimeDashboard({ isAdmin = false }: { isAdmin?: boolean }) {
  const t = useTranslations("time");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [codes, setCodes] = useState<JobCode[]>([]);
  const [category, setCategory] = useState<TimeCategory>("release");
  const [jobCodeId, setJobCodeId] = useState("");
  const [notes, setNotes] = useState("");
  const [useGps, setUseGps] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/time/entries")
      .then(async (res) => {
        if (!res.ok) throw new Error("entries");
        return res.json();
      })
      .then((data) => {
        setEntries(data.entries);
        setActiveEntry(data.activeEntry);
      })
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));

    void fetch("/api/time/codes")
      .then(async (res) => {
        if (!res.ok) throw new Error("codes");
        return res.json();
      })
      .then((data) => {
        setCodes(data.codes);
        setJobCodeId(defaultCodeForCategory(data.codes, "release"));
      })
      .catch(() => setError(t("loadError")));
  }, [t]);

  const filteredCodes = codes.filter((c) => c.category === category);

  function handleCategoryChange(next: TimeCategory) {
    setCategory(next);
    setJobCodeId(defaultCodeForCategory(codes, next));
  }

  async function reloadEntries() {
    const res = await fetch("/api/time/entries");
    if (!res.ok) throw new Error("entries");
    const data = await res.json();
    setEntries(data.entries);
    setActiveEntry(data.activeEntry);
  }

  async function handleClockIn() {
    setWorking(true);
    setError(null);
    try {
      const clockInGps = useGps ? await tryGps() : undefined;
      const res = await fetch("/api/time/entries/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, jobCodeId, notes, clockInGps }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "clock-in");
      }
      setNotes("");
      await reloadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("clockInError"));
    } finally {
      setWorking(false);
    }
  }

  async function handleClockOut() {
    if (!activeEntry) return;
    setWorking(true);
    setError(null);
    try {
      const clockOutGps = useGps ? await tryGps() : undefined;
      const res = await fetch("/api/time/entries/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: activeEntry.id,
          notes,
          clockOutGps,
        }),
      });
      if (!res.ok) throw new Error("clock-out");
      setNotes("");
      await reloadEntries();
    } catch {
      setError(t("clockOutError"));
    } finally {
      setWorking(false);
    }
  }

  async function handleAction(
    entryId: string,
    action: "submit" | "approve" | "reject",
  ) {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(`/api/time/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(action);
      await reloadEntries();
    } catch {
      setError(t("actionError"));
    } finally {
      setWorking(false);
    }
  }

  function handleExportCsv() {
    window.location.assign("/api/time/export");
  }

  if (loading) {
    return <p className="text-gray-600">{t("loading")}</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-opseu-dark">
            {isAdmin ? t("adminTitle") : t("title")}
          </h1>
          <p className="mt-1 text-gray-600">
            {isAdmin ? t("adminSubtitle") : t("subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isAdmin && (
            <Link href="/app/time/admin">
              <Button variant="outline">{t("adminLink")}</Button>
            </Link>
          )}
          {isAdmin && (
            <>
              <Link href="/app/time">
                <Button variant="outline">{t("workerLink")}</Button>
              </Link>
              <Button variant="outline" onClick={handleExportCsv}>
                {t("exportCsv")}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 text-red-600" role="alert">
          {error}
        </p>
      )}

      {!isAdmin && (
        <Card className="mt-6">
          <CardTitle>
            {activeEntry ? t("clockedIn") : t("clockPanel")}
          </CardTitle>
          {activeEntry ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-gray-600">
                {t("activeSince", {
                  category: t(`categories.${activeEntry.category}`),
                  code: activeEntry.jobCodeLabel,
                  duration: formatDuration(activeEntry),
                })}
              </p>
              <Button onClick={handleClockOut} disabled={working}>
                {t("clockOut")}
              </Button>
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="font-medium">{t("category")}</span>
                <select
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  value={category}
                  onChange={(e) =>
                    handleCategoryChange(e.target.value as TimeCategory)
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`categories.${c}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="font-medium">{t("jobCode")}</span>
                <select
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  value={jobCodeId}
                  onChange={(e) => setJobCodeId(e.target.value)}
                >
                  {filteredCodes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="font-medium">{t("notes")}</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={useGps}
                  onChange={(e) => setUseGps(e.target.checked)}
                />
                {t("gpsOptional")}
              </label>
              <Button onClick={handleClockIn} disabled={working || !jobCodeId}>
                {t("clockIn")}
              </Button>
            </div>
          )}
        </Card>
      )}

      <Card className="mt-6">
        <CardTitle>{isAdmin ? t("localBoard") : t("recentEntries")}</CardTitle>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">{t("noEntries")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-200">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {isAdmin
                      ? entry.workerName
                      : t(`categories.${entry.category}`)}
                    {" · "}
                    {entry.jobCodeLabel}
                  </p>
                  <p className="text-gray-600">
                    {new Date(entry.clockInAt).toLocaleString()}
                    {entry.clockOutAt && ` → ${formatDuration(entry)}`}
                    {" · "}
                    {t(`status.${entry.status}`)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isAdmin && entry.status === "completed" && (
                    <Button
                      variant="outline"
                      onClick={() => handleAction(entry.id, "submit")}
                      disabled={working}
                    >
                      {t("submit")}
                    </Button>
                  )}
                  {isAdmin && entry.status === "submitted" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleAction(entry.id, "approve")}
                        disabled={working}
                      >
                        {t("approve")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleAction(entry.id, "reject")}
                        disabled={working}
                      >
                        {t("reject")}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="mt-6 text-xs text-gray-500">{t("disclaimer")}</p>
    </div>
  );
}
