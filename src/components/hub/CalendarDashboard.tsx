"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import {
  buildIcsCalendar,
  downloadIcs,
} from "@/lib/calendar/ics";
import {
  hubEventsToIcsInputs,
  type HubCalendarEvent,
} from "@/lib/calendar/hub-events";

export function CalendarDashboard() {
  const t = useTranslations("qol.calendar");
  const th = useTranslations("hub");
  const [events, setEvents] = useState<HubCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/calendar")
      .then(async (res) => {
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { events: HubCalendarEvent[] };
        setEvents(data.events);
      })
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  const [now] = useState(() => Date.now());
  const upcoming = useMemo(
    () => events.filter((e) => new Date(e.startsAt).getTime() >= now),
    [events, now],
  );
  const past = useMemo(
    () =>
      events
        .filter((e) => new Date(e.startsAt).getTime() < now)
        .slice()
        .reverse(),
    [events, now],
  );

  const meetingCount = events.filter((e) => e.kind === "grievance_meeting")
    .length;
  const sessionCount = events.filter((e) => e.kind === "bumping_session")
    .length;

  const exportIcs = () => {
    if (events.length === 0) return;
    const ics = buildIcsCalendar(hubEventsToIcsInputs(events));
    downloadIcs("hub-calendar.ics", ics);
  };

  if (loading) return <p className="text-gray-600">{t("loading")}</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
          <p className="mt-1 text-gray-600">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={exportIcs}
            disabled={events.length === 0}
          >
            {t("exportIcs")}
          </Button>
          <Link href="/app">
            <Button variant="outline">{th("backToDashboard")}</Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-gray-500">{t("countMeetings")}</p>
          <p className="text-3xl font-bold text-opseu-dark">{meetingCount}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">{t("countSessions")}</p>
          <p className="text-3xl font-bold text-opseu-dark">{sessionCount}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">{t("countUpcoming")}</p>
          <p className="text-3xl font-bold text-opseu-blue">{upcoming.length}</p>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-opseu-dark">{t("sectionUpcoming")}</h2>
        {upcoming.length === 0 ? (
          <Card className="mt-3">
            <p className="text-gray-600">{t("emptyUpcoming")}</p>
          </Card>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcoming.map((e) => (
              <CalendarEventRow key={`${e.kind}-${e.id}`} event={e} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-gray-700">{t("sectionPast")}</h2>
        {past.length === 0 ? (
          <Card className="mt-3">
            <p className="text-gray-600">{t("emptyPast")}</p>
          </Card>
        ) : (
          <ul className="mt-3 space-y-2">
            {past.map((e) => (
              <CalendarEventRow key={`${e.kind}-${e.id}`} event={e} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CalendarEventRow({ event }: { event: HubCalendarEvent }) {
  const t = useTranslations("qol.calendar");
  const when = new Date(event.startsAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const kindLabel =
    event.kind === "grievance_meeting" ? t("kindMeeting") : t("kindSession");

  return (
    <li>
      <Link href={event.href}>
        <Card className="transition hover:border-opseu-blue/40">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-opseu-blue">
                {kindLabel}
              </p>
              <CardTitle className="mt-0.5 text-base">{event.title}</CardTitle>
              {event.location ? (
                <p className="mt-1 text-sm text-gray-600">{event.location}</p>
              ) : null}
              {event.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                  {event.description}
                </p>
              ) : null}
            </div>
            <time
              dateTime={event.startsAt}
              className="shrink-0 text-sm font-medium text-gray-700"
            >
              {when}
            </time>
          </div>
        </Card>
      </Link>
    </li>
  );
}
