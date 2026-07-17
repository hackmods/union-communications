"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import type {
  JobCode,
  TimeCategory,
  TimeEntry,
  TimeExpectedWindow,
  TimeNeededRow,
  TimeWorker,
} from "@/types/time";

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

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultFromTo(daysBack: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - daysBack);
  return { from: from.toISOString(), to: to.toISOString() };
}

function localInputToIso(value: string): string {
  return new Date(value).toISOString();
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

type ReportTotals = {
  byWorker: Array<{
    workerId: string;
    workerName: string;
    hours: number;
    entries: number;
  }>;
  byCategory: Array<{ category: string; hours: number }>;
  byEvent: Array<{
    eventId: string;
    eventLabel: string;
    hours: number;
    workers: number;
  }>;
  totalHours: number;
  entryCount: number;
  neededCount: number;
};

export function TimeDashboard({ isAdmin = false }: { isAdmin?: boolean }) {
  const t = useTranslations("time");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [codes, setCodes] = useState<JobCode[]>([]);
  const [workers, setWorkers] = useState<TimeWorker[]>([]);
  const [windows, setWindows] = useState<TimeExpectedWindow[]>([]);
  const [needed, setNeeded] = useState<TimeNeededRow[]>([]);
  const [reportTotals, setReportTotals] = useState<ReportTotals | null>(null);
  const [category, setCategory] = useState<TimeCategory>("release");
  const [jobCodeId, setJobCodeId] = useState("");
  const [notes, setNotes] = useState("");
  const [useGps, setUseGps] = useState(false);
  const [manualStart, setManualStart] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() - 2);
    return toLocalInputValue(d);
  });
  const [manualEnd, setManualEnd] = useState(() => toLocalInputValue(new Date()));
  const [manualEventLabel, setManualEventLabel] = useState("");
  const [bulkLabel, setBulkLabel] = useState("");
  const [bulkStart, setBulkStart] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() - 2);
    return toLocalInputValue(d);
  });
  const [bulkEnd, setBulkEnd] = useState(() => toLocalInputValue(new Date()));
  const [bulkWorkerIds, setBulkWorkerIds] = useState<string[]>([]);
  const [windowLabel, setWindowLabel] = useState("");
  const [windowStart, setWindowStart] = useState(() => toLocalInputValue(new Date()));
  const [windowEnd, setWindowEnd] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return toLocalInputValue(d);
  });
  const [windowAttendees, setWindowAttendees] = useState<string[]>([]);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [reportFrom, setReportFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toLocalInputValue(d).slice(0, 16);
  });
  const [reportTo, setReportTo] = useState(() => toLocalInputValue(new Date()));
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadNeeded(from?: string, to?: string) {
    const range = from && to ? { from, to } : defaultFromTo(isAdmin ? 14 : 14);
    const qs = new URLSearchParams({ from: range.from, to: range.to });
    const res = await fetch(`/api/time/needed?${qs}`);
    if (!res.ok) return;
    const data = await res.json();
    setNeeded(data.needed);
  }

  async function loadAdminExtras() {
    const [workersRes, windowsRes] = await Promise.all([
      fetch("/api/time/workers"),
      fetch("/api/time/windows"),
    ]);
    if (workersRes.ok) {
      const data = await workersRes.json();
      setWorkers(data.workers);
    }
    if (windowsRes.ok) {
      const data = await windowsRes.json();
      setWindows(data.windows);
    }
  }

  async function loadReport() {
    const qs = new URLSearchParams({
      from: localInputToIso(reportFrom),
      to: localInputToIso(reportTo),
    });
    const res = await fetch(`/api/time/report/union-business?${qs}`);
    if (!res.ok) throw new Error("report");
    const data = await res.json();
    setReportTotals(data.totals);
    setNeeded(data.needed);
  }

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/time/entries")
      .then(async (res) => {
        if (!res.ok) throw new Error("entries");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setEntries(data.entries);
        setActiveEntry(data.activeEntry);
      })
      .catch(() => {
        if (!cancelled) setError(t("loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    void fetch("/api/time/codes")
      .then(async (res) => {
        if (!res.ok) throw new Error("codes");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setCodes(data.codes);
        setJobCodeId(defaultCodeForCategory(data.codes, "release"));
      })
      .catch(() => {
        if (!cancelled) setError(t("loadError"));
      });

    const range = defaultFromTo(14);
    const neededQs = new URLSearchParams({
      from: range.from,
      to: range.to,
    });
    void fetch(`/api/time/needed?${neededQs}`)
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) setNeeded(data.needed);
      });

    if (isAdmin) {
      void Promise.all([
        fetch("/api/time/workers"),
        fetch("/api/time/windows"),
      ]).then(async ([workersRes, windowsRes]) => {
        if (cancelled) return;
        if (workersRes.ok) {
          const data = await workersRes.json();
          if (!cancelled) setWorkers(data.workers);
        }
        if (windowsRes.ok) {
          const data = await windowsRes.json();
          if (!cancelled) setWindows(data.windows);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [t, isAdmin]);

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
      await loadNeeded();
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
      await loadNeeded();
    } catch {
      setError(t("clockOutError"));
    } finally {
      setWorking(false);
    }
  }

  async function handleManualEntry() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/time/entries/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          jobCodeId,
          clockInAt: localInputToIso(manualStart),
          clockOutAt: localInputToIso(manualEnd),
          notes,
          eventLabel: manualEventLabel || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "manual");
      }
      setNotes("");
      setManualEventLabel("");
      await reloadEntries();
      await loadNeeded();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("manualError"));
    } finally {
      setWorking(false);
    }
  }

  async function handleBulkEvent() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/time/entries/bulk-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          jobCodeId,
          clockInAt: localInputToIso(bulkStart),
          clockOutAt: localInputToIso(bulkEnd),
          eventLabel: bulkLabel,
          notes,
          workerIds: bulkWorkerIds,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "bulk");
      }
      setNotes("");
      setBulkLabel("");
      setBulkWorkerIds([]);
      await reloadEntries();
      await loadNeeded();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("bulkError"));
    } finally {
      setWorking(false);
    }
  }

  async function handleCreateWindow() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/time/windows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: windowLabel,
          startsAt: localInputToIso(windowStart),
          endsAt: localInputToIso(windowEnd),
          category,
          jobCodeId: jobCodeId || undefined,
          attendeeWorkerIds: windowAttendees,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "window");
      }
      setWindowLabel("");
      setWindowAttendees([]);
      await loadAdminExtras();
      await loadNeeded();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("windowError"));
    } finally {
      setWorking(false);
    }
  }

  async function handleAddWorker() {
    if (!newWorkerName.trim()) return;
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/time/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: newWorkerName.trim(),
          trackGaps: true,
        }),
      });
      if (!res.ok) throw new Error("worker");
      setNewWorkerName("");
      await loadAdminExtras();
    } catch {
      setError(t("workerError"));
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
      await loadNeeded();
    } catch {
      setError(t("actionError"));
    } finally {
      setWorking(false);
    }
  }

  function handleExportCsv() {
    const qs = new URLSearchParams({
      from: localInputToIso(reportFrom),
      to: localInputToIso(reportTo),
    });
    window.location.assign(`/api/time/export?${qs}`);
  }

  function toggleId(
    list: string[],
    id: string,
    setter: (next: string[]) => void,
  ) {
    setter(
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    );
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

      {needed.length > 0 && (
        <Callout className="mt-6" tone="muted">
          <p className="font-medium">{t("neededTitle")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {needed.slice(0, isAdmin ? 12 : 5).map((row, i) => (
              <li key={`${row.kind}-${row.workerId}-${row.windowId ?? row.date}-${i}`}>
                {row.kind === "expected_window"
                  ? t("neededWindow", {
                      worker: row.workerName,
                      label: row.windowLabel ?? "",
                    })
                  : t("neededGap", {
                      worker: row.workerName,
                      date: row.date ?? "",
                    })}
              </li>
            ))}
          </ul>
          {needed.length > (isAdmin ? 12 : 5) && (
            <p className="mt-2 text-sm">
              {t("neededMore", { count: needed.length - (isAdmin ? 12 : 5) })}
            </p>
          )}
        </Callout>
      )}

      {!isAdmin && (
        <>
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

          <Card className="mt-6">
            <CardTitle>{t("manualTitle")}</CardTitle>
            <p className="mt-1 text-sm text-gray-600">{t("manualHint")}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="font-medium">{t("start")}</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  value={manualStart}
                  onChange={(e) => setManualStart(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="font-medium">{t("end")}</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  value={manualEnd}
                  onChange={(e) => setManualEnd(e.target.value)}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="font-medium">{t("eventLabelOptional")}</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  value={manualEventLabel}
                  onChange={(e) => setManualEventLabel(e.target.value)}
                />
              </label>
              <Button
                onClick={handleManualEntry}
                disabled={working || !jobCodeId}
              >
                {t("manualSubmit")}
              </Button>
            </div>
          </Card>
        </>
      )}

      {isAdmin && (
        <>
          <Card className="mt-6">
            <CardTitle>{t("bulkTitle")}</CardTitle>
            <p className="mt-1 text-sm text-gray-600">{t("bulkHint")}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                <span className="font-medium">{t("eventLabel")}</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  value={bulkLabel}
                  onChange={(e) => setBulkLabel(e.target.value)}
                />
              </label>
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
              <label className="text-sm">
                <span className="font-medium">{t("start")}</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  value={bulkStart}
                  onChange={(e) => setBulkStart(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="font-medium">{t("end")}</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  value={bulkEnd}
                  onChange={(e) => setBulkEnd(e.target.value)}
                />
              </label>
              <fieldset className="sm:col-span-2">
                <legend className="text-sm font-medium">{t("workers")}</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {workers.map((w) => (
                    <label key={w.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={bulkWorkerIds.includes(w.id)}
                        onChange={() =>
                          toggleId(bulkWorkerIds, w.id, setBulkWorkerIds)
                        }
                      />
                      {w.displayName}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Button
                onClick={handleBulkEvent}
                disabled={
                  working || !jobCodeId || !bulkLabel || bulkWorkerIds.length === 0
                }
              >
                {t("bulkSubmit")}
              </Button>
            </div>
          </Card>

          <Card className="mt-6">
            <CardTitle>{t("windowsTitle")}</CardTitle>
            <p className="mt-1 text-sm text-gray-600">{t("windowsHint")}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                <span className="font-medium">{t("windowLabel")}</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  value={windowLabel}
                  onChange={(e) => setWindowLabel(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="font-medium">{t("start")}</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="font-medium">{t("end")}</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                />
              </label>
              <fieldset className="sm:col-span-2">
                <legend className="text-sm font-medium">{t("attendees")}</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {workers.map((w) => (
                    <label key={w.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={windowAttendees.includes(w.id)}
                        onChange={() =>
                          toggleId(windowAttendees, w.id, setWindowAttendees)
                        }
                      />
                      {w.displayName}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Button
                onClick={handleCreateWindow}
                disabled={
                  working || !windowLabel || windowAttendees.length === 0
                }
              >
                {t("windowSubmit")}
              </Button>
            </div>
            {windows.length > 0 && (
              <ul className="mt-4 divide-y divide-gray-200 text-sm">
                {windows.slice(0, 8).map((w) => (
                  <li key={w.id} className="py-2">
                    <span className="font-medium">{w.label}</span>
                    {" · "}
                    {new Date(w.startsAt).toLocaleString()} →{" "}
                    {new Date(w.endsAt).toLocaleString()}
                    {" · "}
                    {t("attendeeCount", { count: w.attendeeWorkerIds.length })}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="mt-6">
            <CardTitle>{t("rosterTitle")}</CardTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="text"
                className="min-w-[12rem] flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder={t("workerNamePlaceholder")}
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={handleAddWorker}
                disabled={working || !newWorkerName.trim()}
              >
                {t("addWorker")}
              </Button>
            </div>
            <ul className="mt-3 text-sm text-gray-700">
              {workers.map((w) => (
                <li key={w.id}>
                  {w.displayName}
                  {w.trackGaps ? ` · ${t("tracksGaps")}` : ""}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="mt-6">
            <CardTitle>{t("reportTitle")}</CardTitle>
            <p className="mt-1 text-sm text-gray-600">{t("reportHint")}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="font-medium">{t("from")}</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  value={reportFrom}
                  onChange={(e) => setReportFrom(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="font-medium">{t("to")}</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  value={reportTo}
                  onChange={(e) => setReportTo(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button
                  onClick={() => {
                    setWorking(true);
                    setError(null);
                    void loadReport()
                      .catch(() => setError(t("reportError")))
                      .finally(() => setWorking(false));
                  }}
                  disabled={working}
                >
                  {t("runReport")}
                </Button>
                <Button variant="outline" onClick={handleExportCsv}>
                  {t("exportCsv")}
                </Button>
              </div>
            </div>
            {reportTotals && (
              <div className="mt-4 space-y-3 text-sm">
                <p>
                  {t("reportSummary", {
                    hours: reportTotals.totalHours.toFixed(1),
                    entries: reportTotals.entryCount,
                    needed: reportTotals.neededCount,
                  })}
                </p>
                {reportTotals.byWorker.length > 0 && (
                  <div>
                    <p className="font-medium">{t("byWorker")}</p>
                    <ul className="mt-1 list-disc pl-5">
                      {reportTotals.byWorker.map((row) => (
                        <li key={row.workerId}>
                          {row.workerName}: {row.hours.toFixed(1)}h (
                          {row.entries})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {reportTotals.byEvent.length > 0 && (
                  <div>
                    <p className="font-medium">{t("byEvent")}</p>
                    <ul className="mt-1 list-disc pl-5">
                      {reportTotals.byEvent.map((row) => (
                        <li key={row.eventId}>
                          {row.eventLabel}: {row.hours.toFixed(1)}h (
                          {row.workers})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        </>
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
                    {entry.eventLabel ? ` · ${entry.eventLabel}` : ""}
                  </p>
                  <p className="text-gray-600">
                    {new Date(entry.clockInAt).toLocaleString()}
                    {entry.clockOutAt && ` → ${formatDuration(entry)}`}
                    {" · "}
                    {t(`status.${entry.status}`)}
                    {" · "}
                    {t(`sources.${entry.entrySource}`)}
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
