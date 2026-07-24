"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { buildIcsEvent, downloadIcs } from "@/lib/calendar/ics";
import type {
  LocalMeetingSchedule,
  MeetingRecurrence,
  NextMeetingInfo,
} from "@/types/meetings";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const NTH_OPTIONS = [1, 2, 3, 4, -1];

export function MeetingScheduleSettings({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("meetings");
  const [schedule, setSchedule] = useState<LocalMeetingSchedule | null>(null);
  const [nextMeeting, setNextMeeting] = useState<NextMeetingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [recurrence, setRecurrence] = useState<MeetingRecurrence>("monthly");
  const [monthlyMode, setMonthlyMode] = useState<"dayOfMonth" | "weekday">(
    "dayOfMonth",
  );
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [weekday, setWeekday] = useState(2);
  const [nthWeekOfMonth, setNthWeekOfMonth] = useState(1);
  const [customDates, setCustomDates] = useState("");
  const [time, setTime] = useState("19:00");
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [location, setLocation] = useState("");
  const [publicBlurb, setPublicBlurb] = useState("");
  const [timezone, setTimezone] = useState("America/Toronto");

  const applyData = useCallback(
    (json: { schedule: LocalMeetingSchedule | null; nextMeeting: NextMeetingInfo | null }) => {
      setSchedule(json.schedule);
      setNextMeeting(json.nextMeeting);
      if (json.schedule) {
        const s = json.schedule;
        setRecurrence(s.recurrence);
        setMonthlyMode(s.dayOfMonth != null ? "dayOfMonth" : "weekday");
        if (s.dayOfMonth != null) setDayOfMonth(s.dayOfMonth);
        if (s.weekday != null) setWeekday(s.weekday);
        if (s.nthWeekOfMonth != null) setNthWeekOfMonth(s.nthWeekOfMonth);
        setCustomDates((s.customDates ?? []).join(", "));
        setTime(s.time);
        setDurationMinutes(s.durationMinutes);
        setLocation(s.location);
        setPublicBlurb(s.publicBlurb ?? "");
        setTimezone(s.timezone);
      } else if (typeof Intl !== "undefined") {
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      }
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/meetings/schedule")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json) applyData(json);
        else if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyData]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);
    setSaving(true);
    const body: Record<string, unknown> = {
      recurrence,
      time,
      durationMinutes,
      location,
      publicBlurb: publicBlurb || undefined,
      timezone,
    };
    if (recurrence === "monthly") {
      if (monthlyMode === "dayOfMonth") {
        body.dayOfMonth = dayOfMonth;
      } else {
        body.weekday = weekday;
        body.nthWeekOfMonth = nthWeekOfMonth;
      }
    } else {
      body.customDates = customDates
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
    }

    const res = await fetch("/api/meetings/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      applyData(await res.json());
    } else {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? t("saveError"));
    }
    setSaving(false);
  }

  function downloadNextIcs() {
    if (!nextMeeting) return;
    const ics = buildIcsEvent({
      uid: `local-meeting-${schedule?.id ?? "next"}@local-union-hub`,
      title: t("icsTitle"),
      description: nextMeeting.publicBlurb,
      location: nextMeeting.location,
      startsAt: nextMeeting.startsAt,
      endsAt: nextMeeting.endsAt,
      reminderMinutesBefore: 60,
    });
    downloadIcs("next-meeting.ics", ics);
  }

  async function copyPublicLink() {
    if (!schedule) return;
    const url = `${window.location.origin}/meetings/${schedule.publicSlug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <p className="text-gray-600">{t("loading")}</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-1 text-gray-600">{t("subtitle")}</p>

      <Card className="mt-4">
        <CardTitle>{t("nextMeeting")}</CardTitle>
        {nextMeeting ? (
          <div className="mt-2 space-y-2">
            <p className="text-lg font-semibold text-opseu-blue">
              {new Date(nextMeeting.startsAt).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">{nextMeeting.location}</p>
            {nextMeeting.publicBlurb && (
              <p className="text-sm text-gray-500">{nextMeeting.publicBlurb}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={downloadNextIcs}>
                {t("downloadIcs")}
              </Button>
              {schedule && (
                <Button size="sm" variant="secondary" onClick={copyPublicLink}>
                  {copied ? t("linkCopied") : t("copyPublicLink")}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">{t("noSchedule")}</p>
        )}
      </Card>

      <Card className="mt-4">
        <CardTitle>{t("configure")}</CardTitle>
        {!canWrite && (
          <p className="mt-1 text-xs text-gray-500">{t("readOnlyHint")}</p>
        )}
        <form onSubmit={save} className="mt-3 space-y-4">
          <fieldset disabled={!canWrite} className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">
                {t("recurrenceLabel")}
              </p>
              <div className="mt-1 flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="recurrence"
                    checked={recurrence === "monthly"}
                    onChange={() => setRecurrence("monthly")}
                  />
                  {t("recurrenceMonthly")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="recurrence"
                    checked={recurrence === "custom"}
                    onChange={() => setRecurrence("custom")}
                  />
                  {t("recurrenceCustom")}
                </label>
              </div>
            </div>

            {recurrence === "monthly" ? (
              <div className="space-y-3 rounded-lg border border-gray-100 p-3">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="monthlyMode"
                      checked={monthlyMode === "dayOfMonth"}
                      onChange={() => setMonthlyMode("dayOfMonth")}
                    />
                    {t("byDayOfMonth")}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="monthlyMode"
                      checked={monthlyMode === "weekday"}
                      onChange={() => setMonthlyMode("weekday")}
                    />
                    {t("byWeekday")}
                  </label>
                </div>
                {monthlyMode === "dayOfMonth" ? (
                  <Input
                    type="number"
                    label={t("dayOfMonth")}
                    min={1}
                    max={31}
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  />
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-sm font-medium text-gray-700">
                      {t("nth")}
                      <select
                        value={nthWeekOfMonth}
                        onChange={(e) =>
                          setNthWeekOfMonth(Number(e.target.value))
                        }
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                      >
                        {NTH_OPTIONS.map((n) => (
                          <option key={n} value={n}>
                            {t(n === -1 ? "nthLast" : `nth${n}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-gray-700">
                      {t("weekday")}
                      <select
                        value={weekday}
                        onChange={(e) => setWeekday(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                      >
                        {WEEKDAYS.map((w) => (
                          <option key={w} value={w}>
                            {t(`weekdayNames.${w}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <Textarea
                label={t("customDatesLabel")}
                value={customDates}
                onChange={(e) => setCustomDates(e.target.value)}
                rows={2}
                placeholder="2026-09-14, 2026-11-09"
              />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="time"
                label={t("time")}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
              <Input
                type="number"
                label={t("durationMinutes")}
                min={15}
                max={600}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              />
            </div>
            <Input
              label={t("location")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
            <Textarea
              label={t("publicBlurbLabel")}
              value={publicBlurb}
              onChange={(e) => setPublicBlurb(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-gray-500">{t("publicBlurbHint")}</p>
            <Input
              label={t("timezoneLabel")}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
            />
          </fieldset>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {canWrite && (
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? t("saving") : t("save")}
            </Button>
          )}
        </form>
      </Card>
    </div>
  );
}
