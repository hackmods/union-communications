"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import type { PortalSearchHit, StationPayload } from "@/types/portal";
import { PortalRetryCallout } from "@/components/portal/PortalRetryCallout";
import { PortalPanel } from "@/components/portal/PortalPanel";
import { PortalPageLoading } from "@/components/portal/PortalPageLoading";
import { cn } from "@/lib/utils";

export function PortalStation() {
  const t = useTranslations("portal");
  const [station, setStation] = useState<StationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<"blank" | "lec" | "jhsc" | "campaign">(
    "blank",
  );
  const [unionScope, setUnionScope] = useState(false);
  const [canCreateCircle, setCanCreateCircle] = useState(false);
  const [canCreateUnionCircle, setCanCreateUnionCircle] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PortalSearchHit[]>([]);
  const loadGen = useRef(0);

  const load = useCallback(async () => {
    const gen = ++loadGen.current;
    try {
      const res = await fetch("/api/portal/station");
      if (gen !== loadGen.current) return;
      if (!res.ok) {
        setError(t("loadError"));
        return;
      }
      const data = (await res.json()) as { station: StationPayload; authorization?: { canCreateCircle: boolean; canCreateUnionCircle: boolean } };
      setStation(data.station);
      setCanCreateCircle(data.authorization?.canCreateCircle === true);
      setCanCreateUnionCircle(data.authorization?.canCreateUnionCircle === true);
      setError(null);
    } catch {
      if (gen !== loadGen.current) return;
      setError(t("loadError"));
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    const gen = ++loadGen.current;
    void fetch("/api/portal/station")
      .then(async (res) => {
        if (cancelled || gen !== loadGen.current) return;
        if (!res.ok) {
          setError(t("loadError"));
          return;
        }
        const data = (await res.json()) as { station: StationPayload; authorization?: { canCreateCircle: boolean; canCreateUnionCircle: boolean } };
        if (cancelled || gen !== loadGen.current) return;
        setStation(data.station);
        setCanCreateCircle(data.authorization?.canCreateCircle === true);
        setCanCreateUnionCircle(data.authorization?.canCreateUnionCircle === true);
        setError(null);
      })
      .catch(() => {
        if (!cancelled && gen === loadGen.current) setError(t("loadError"));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const handle = setTimeout(() => {
      void fetch(`/api/portal/search?q=${encodeURIComponent(q)}`).then(
        async (res) => {
          if (!res.ok) return;
          const data = (await res.json()) as { hits: PortalSearchHit[] };
          setHits(data.hits);
        },
      );
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const displayHits = query.trim().length < 2 ? [] : hits;

  async function toggleStar(circleId: string, starred: boolean) {
    await fetch(`/api/portal/circles/${circleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starred: !starred }),
    });
    await load();
  }

  async function createCircle(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setCreateError(null);
    loadGen.current += 1;
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 3);
    const isCampaign = template === "campaign";
    try {
      const res = await fetch("/api/portal/circles/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          kind: isCampaign ? "campaign" : "committee",
          template,
          ...(unionScope ? { scope: "union" } : {}),
          ...(isCampaign
            ? {
                frontStartsAt: start.toISOString(),
                frontEndsAt: end.toISOString(),
              }
            : {}),
        }),
      });
      if (res.ok) {
        setName("");
        setTemplate("blank");
        setUnionScope(false);
        await load();
        return;
      }
      setCreateError(t("createError"));
    } catch {
      setCreateError(t("createError"));
    } finally {
      setCreating(false);
    }
  }

  if (error) {
    return (
      <PortalRetryCallout message={error} onRetry={() => void load()} />
    );
  }

  if (!station) {
    return <PortalPageLoading columns={3} />;
  }

  const overdueTotal = station.circles.reduce(
    (n, c) => n + c.overdueActions,
    0,
  );
  const hall = station.circles.find((c) => c.kind === "local_hall");
  const upcoming = station.upcomingEvents ?? [];
  const digestBusy =
    station.weekDigest.bulletinPosts +
      station.weekDigest.actionsCompleted +
      station.weekDigest.floorMessages >
    0;

  return (
    <div className="space-y-6">
      <PortalPanel
        eyebrow={t("portalEyebrow")}
        title={t("stationTitle")}
        titleId="portal-together-heading"
        titleLevel="page"
        lead={t("stationSubtitle")}
      >
        {hall ? (
          <div className="flex flex-col gap-4 rounded-xl border border-opseu-blue/25 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <p className="max-w-prose text-sm leading-relaxed text-gray-700">
              {t("startHere", { hall: hall.name })}
            </p>
            <Link
              href={`/portal/circles/${hall.id}`}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-opseu-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-opseu-blue/90"
            >
              {t("openHall")}
              <span className="ml-1.5" aria-hidden>
                →
              </span>
            </Link>
          </div>
        ) : null}

        {(digestBusy || overdueTotal > 0 || station.dispatchUnread > 0) && (
          <div
            className={cn(
              "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
              hall && "mt-4",
            )}
          >
            {digestBusy ? (
              <Callout tone="muted" className="sm:col-span-2 lg:col-span-1">
                {t("weekDigest", {
                  bulletin: station.weekDigest.bulletinPosts,
                  done: station.weekDigest.actionsCompleted,
                  floor: station.weekDigest.floorMessages,
                })}
              </Callout>
            ) : null}
            {overdueTotal > 0 ? (
              <Callout>{t("overdueBadge", { count: overdueTotal })}</Callout>
            ) : null}
            {station.dispatchUnread > 0 ? (
              <Callout>
                <Link
                  href="/portal/dispatch"
                  className="font-medium text-opseu-dark underline-offset-2 hover:underline"
                >
                  {t("dispatchUnread", { count: station.dispatchUnread })}
                </Link>
              </Callout>
            ) : null}
          </div>
        )}
      </PortalPanel>

      <PortalPanel
        title={t("yourCircles")}
        titleId="portal-circles-heading"
        titleLevel="section"
      >
        {station.circles.length === 0 ? (
          <p className="text-sm leading-relaxed text-gray-600">
            {t("emptyCircles")}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {station.circles.map((c) => {
              const meta = [
                t(`kind.${c.kind}`),
                !c.localId && c.kind !== "local_hall"
                  ? t("unionScopeBadge")
                  : null,
                c.overdueActions > 0
                  ? t("overdueShort", { count: c.overdueActions })
                  : null,
                c.dispatchUnread > 0
                  ? t("unreadShort", { count: c.dispatchUnread })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={c.id} className="min-w-0">
                  <div className="group relative flex h-full min-h-11 flex-col rounded-xl border border-slate-200/90 bg-white p-3.5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-opseu-blue/40 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/portal/circles/${c.id}`}
                        className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50 focus-visible:ring-offset-2"
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-opseu-dark">
                            {c.name}
                          </span>
                          <span
                            className="mt-0.5 shrink-0 text-sm font-medium text-opseu-blue transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                            aria-hidden
                          >
                            →
                          </span>
                        </span>
                        <span className="mt-1 block text-sm text-gray-600">
                          {meta}
                        </span>
                        {c.description ? (
                          <span className="mt-1 block text-sm leading-relaxed text-gray-500">
                            {c.description}
                          </span>
                        ) : null}
                      </Link>
                      <button
                        type="button"
                        className="min-h-11 min-w-11 shrink-0 rounded-lg text-lg hover:bg-opseu-blue/5"
                        aria-label={
                          c.membership.starred ? t("unstar") : t("star")
                        }
                        onClick={() => void toggleStar(c.id, c.membership.starred)}
                      >
                        {c.membership.starred ? "★" : "☆"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PortalPanel>

      {canCreateCircle ? (
        <PortalPanel
          title={t("createCircleHeading")}
          titleId="portal-create-heading"
          titleLevel="section"
          lead={t("createCircleLead")}
        >
          <form
            onSubmit={createCircle}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <label className="text-sm text-gray-700">
              {t("templateLabel")}
              <select
                className="mt-1 block min-h-11 w-full rounded-lg border border-gray-300 bg-white px-2 sm:w-auto"
                value={template}
                onChange={(e) =>
                  setTemplate(e.target.value as typeof template)
                }
              >
                <option value="blank">{t("template.blank")}</option>
                <option value="lec">{t("template.lec")}</option>
                <option value="jhsc">{t("template.jhsc")}</option>
                <option value="campaign">{t("template.campaign")}</option>
              </select>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("newCirclePlaceholder")}
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 sm:min-w-[12rem]"
              aria-label={t("newCirclePlaceholder")}
            />
            <Button type="submit" disabled={creating || !name.trim()}>
              {t("createCircle")}
            </Button>
            {canCreateUnionCircle ? <label className="flex min-h-11 w-full items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="size-4 rounded border-gray-300"
                checked={unionScope}
                onChange={(e) => setUnionScope(e.target.checked)}
              />
              {t("unionScopeLabel")}
            </label> : null}
            {unionScope && canCreateUnionCircle ? (
              <p className="w-full text-sm leading-relaxed text-gray-600">
                {t("unionScopeHint")}
              </p>
            ) : null}
          </form>
          {createError ? (
            <Callout className="mt-3" tone="danger">
              {createError}
            </Callout>
          ) : null}
        </PortalPanel>
      ) : null}

      <PortalPanel
        title={t("activityGlance")}
        titleId="portal-activity-heading"
        titleLevel="section"
        lead={t("activityGlanceLead")}
      >
        <div className="grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          <ActivityColumn
            title={t("upcomingTitle")}
            empty={t("upcomingEmpty")}
            items={upcoming.map((ev) => ({
              id: ev.id,
              href: `/portal/circles/${ev.circleId}?tab=calendar`,
              label: ev.title,
              meta: `${new Date(ev.startsAt).toLocaleString()} · ${ev.circleName}`,
            }))}
          />
          <ActivityColumn
            title={t("myActions")}
            empty={t("emptyActions")}
            items={station.myActions.map((a) => ({
              id: a.id,
              href: `/portal/circles/${a.circleId}?tab=actions`,
              label: a.title,
              meta: a.dueAt
                ? new Date(a.dueAt).toLocaleDateString()
                : undefined,
            }))}
          />
          <ActivityColumn
            title={t("recentBulletin")}
            empty={t("emptyBulletin")}
            className="md:col-span-2 lg:col-span-1"
            items={station.recentBulletin.map((p) => ({
              id: p.id,
              href: `/portal/circles/${p.circleId}?tab=bulletin`,
              label: p.title,
            }))}
          />
        </div>
      </PortalPanel>

      <PortalPanel
        title={t("searchLabel")}
        titleId="portal-search-heading"
        titleLevel="section"
      >
        <label className="block text-sm text-gray-600">
          <span className="sr-only">{t("searchLabel")}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="min-h-11 w-full max-w-xl rounded-lg border border-gray-300 bg-white px-3"
          />
        </label>
        {query.trim().length >= 2 && displayHits.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">{t("searchEmpty")}</p>
        ) : null}
        {displayHits.length > 0 ? (
          <ul className="mt-3 max-w-xl space-y-2">
            {displayHits.map((h) => {
              const tab =
                h.kind === "action"
                  ? "actions"
                  : h.kind === "binder"
                    ? "binder"
                    : "bulletin";
              return (
                <li key={`${h.kind}-${h.id}`}>
                  <Link
                    href={`/portal/circles/${h.circleId}?tab=${tab}`}
                    className="group flex min-h-11 flex-col rounded-lg border border-transparent px-2.5 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-opseu-blue/25 hover:bg-white hover:shadow-sm motion-reduce:hover:translate-y-0"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-opseu-dark">
                        [{t(`searchKind.${h.kind}`)}] {h.title}
                      </span>
                      <span
                        className="shrink-0 text-sm font-medium text-opseu-blue transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                        aria-hidden
                      >
                        →
                      </span>
                    </span>
                    <span className="mt-0.5 text-sm text-gray-500">
                      {h.circleName}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </PortalPanel>
    </div>
  );
}

type ActivityItem = {
  id: string;
  href: string;
  label: string;
  meta?: string;
};

function ActivityColumn({
  title,
  empty,
  items,
  className,
}: {
  title: string;
  empty: string;
  items: ActivityItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-slate-200/90 bg-white/90 p-3.5 shadow-sm",
        className,
      )}
    >
      <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-gray-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex min-h-11 flex-col rounded-lg border border-transparent px-2 py-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-opseu-blue/20 hover:bg-opseu-blue/[0.04] hover:shadow-sm motion-reduce:hover:translate-y-0"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-opseu-dark">
                    {item.label}
                  </span>
                  <span
                    className="shrink-0 text-sm font-medium text-opseu-blue transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                    aria-hidden
                  >
                    →
                  </span>
                </span>
                {item.meta ? (
                  <span className="mt-0.5 text-sm text-gray-500">{item.meta}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
