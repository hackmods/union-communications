"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import type { PortalSearchHit, StationPayload } from "@/types/portal";
import { canCreateCircle } from "@/lib/portal/access";
import { PortalRetryCallout } from "@/components/portal/PortalRetryCallout";
import type { UserRole } from "@/types/tenant";

export function PortalStation({ roles }: { roles: UserRole[] }) {
  const t = useTranslations("portal");
  const [station, setStation] = useState<StationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<"blank" | "lec" | "jhsc" | "campaign">(
    "blank",
  );
  const [unionScope, setUnionScope] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PortalSearchHit[]>([]);
  const allowCreate = canCreateCircle(roles);
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
      const data = (await res.json()) as { station: StationPayload };
      setStation(data.station);
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
        const data = (await res.json()) as { station: StationPayload };
        if (cancelled || gen !== loadGen.current) return;
        setStation(data.station);
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
    return <p className="text-gray-600">{t("loading")}</p>;
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

  const searchCard = (
    <Card density="compact">
      <details>
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          {t("searchLabel")}
        </summary>
        <label className="mt-2 block text-sm text-gray-600">
          <span className="sr-only">{t("searchLabel")}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="mt-1 min-h-11 w-full max-w-xl rounded-lg border border-gray-300 px-3"
          />
        </label>
        {query.trim().length >= 2 && displayHits.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">{t("searchEmpty")}</p>
        ) : null}
        {displayHits.length > 0 ? (
          <ul className="mt-2 max-w-xl space-y-1 border-l-4 border-opseu-blue pl-3">
            {displayHits.map((h) => {
              const tab =
                h.kind === "action"
                  ? "actions"
                  : h.kind === "binder"
                    ? "binder"
                    : "bulletin";
              return (
                <li key={`${h.kind}-${h.id}`} className="text-sm">
                  <Link
                    href={`/portal/circles/${h.circleId}?tab=${tab}`}
                    className="font-medium text-opseu-dark hover:underline"
                  >
                    [{t(`searchKind.${h.kind}`)}] {h.title}
                  </Link>
                  <span className="text-gray-500"> · {h.circleName}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </details>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-opseu-dark sm:text-3xl">
          {t("stationTitle")}
        </h1>
        <p className="mt-1 max-w-prose text-sm text-gray-600 sm:text-base">
          {t("stationSubtitle")}
        </p>
      </div>

      {hall ? (
        <Card density="compact" className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-prose text-sm text-gray-700">
            {t("startHere", { hall: hall.name })}
          </p>
          <Link
            href={`/portal/circles/${hall.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-opseu-blue px-4 text-sm font-semibold text-white hover:bg-opseu-dark"
          >
            {t("openHall")}
          </Link>
        </Card>
      ) : null}

      {digestBusy ? (
        <Callout tone="muted">
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
          <Link href="/portal/dispatch" className="font-medium text-opseu-dark hover:underline">
            {t("dispatchUnread", { count: station.dispatchUnread })}
          </Link>
        </Callout>
      ) : null}

      <Card density="compact">
        <h2 className="text-sm font-medium text-gray-700">{t("yourCircles")}</h2>
        {station.circles.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">{t("emptyCircles")}</p>
        ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {station.circles.map((c) => (
            <li
              key={c.id}
              className="flex items-start justify-between gap-3 border-l-4 border-opseu-blue bg-white py-3 pl-4 pr-3 shadow-sm"
            >
              <div className="min-w-0">
                <Link
                  href={`/portal/circles/${c.id}`}
                  className="font-semibold text-opseu-dark hover:underline"
                >
                  {c.name}
                </Link>
                <p className="text-sm text-gray-600">
                  {t(`kind.${c.kind}`)}
                  {!c.localId && c.kind !== "local_hall"
                    ? ` · ${t("unionScopeBadge")}`
                    : ""}
                  {c.overdueActions > 0
                    ? ` · ${t("overdueShort", { count: c.overdueActions })}`
                    : ""}
                  {c.dispatchUnread > 0
                    ? ` · ${t("unreadShort", { count: c.dispatchUnread })}`
                    : ""}
                </p>
                {c.description ? (
                  <p className="mt-1 text-sm text-gray-500">{c.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="min-h-11 min-w-11 text-lg"
                aria-label={
                  c.membership.starred ? t("unstar") : t("star")
                }
                onClick={() => void toggleStar(c.id, c.membership.starred)}
              >
                {c.membership.starred ? "★" : "☆"}
              </button>
            </li>
          ))}
        </ul>
        )}
      </Card>

      {allowCreate ? (
        <Card density="compact">
          <form onSubmit={createCircle} className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              {t("templateLabel")}
              <select
                className="mt-1 block min-h-11 rounded-lg border border-gray-300 px-2"
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
              className="min-h-11 min-w-[12rem] flex-1 rounded-lg border border-gray-300 px-3"
              aria-label={t("newCirclePlaceholder")}
            />
            <Button type="submit" disabled={creating || !name.trim()}>
              {t("createCircle")}
            </Button>
            <label className="flex min-h-11 w-full items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="size-4 rounded border-gray-300"
                checked={unionScope}
                onChange={(e) => setUnionScope(e.target.checked)}
              />
              {t("unionScopeLabel")}
            </label>
            {unionScope ? (
              <p className="w-full text-sm text-gray-600">{t("unionScopeHint")}</p>
            ) : null}
          </form>
          {createError ? (
            <Callout className="mt-3" tone="danger">
              {createError}
            </Callout>
          ) : null}
        </Card>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3">
        <Card density="compact">
          <h2 className="text-sm font-medium text-gray-700">{t("upcomingTitle")}</h2>
          <ul className="mt-2 space-y-2">
            {upcoming.length === 0 ? (
              <li className="text-sm text-gray-500">{t("upcomingEmpty")}</li>
            ) : (
              upcoming.map((ev) => (
                <li key={ev.id} className="text-sm">
                  <Link
                    href={`/portal/circles/${ev.circleId}?tab=calendar`}
                    className="font-medium text-opseu-dark hover:underline"
                  >
                    {ev.title}
                  </Link>
                  <span className="ml-2 text-gray-500">
                    {new Date(ev.startsAt).toLocaleString()} · {ev.circleName}
                  </span>
                </li>
              ))
            )}
          </ul>
        </Card>
        <Card density="compact">
          <h2 className="text-sm font-medium text-gray-700">{t("myActions")}</h2>
          <ul className="mt-2 space-y-2">
            {station.myActions.length === 0 ? (
              <li className="text-sm text-gray-500">{t("emptyActions")}</li>
            ) : (
              station.myActions.map((a) => (
                <li key={a.id} className="text-sm">
                  <Link
                    href={`/portal/circles/${a.circleId}?tab=actions`}
                    className="font-medium text-opseu-dark hover:underline"
                  >
                    {a.title}
                  </Link>
                  {a.dueAt ? (
                    <span className="ml-2 text-gray-500">
                      {new Date(a.dueAt).toLocaleDateString()}
                    </span>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </Card>
        <Card density="compact">
          <h2 className="text-sm font-medium text-gray-700">
            {t("recentBulletin")}
          </h2>
          <ul className="mt-2 space-y-2">
            {station.recentBulletin.length === 0 ? (
              <li className="text-sm text-gray-500">{t("emptyBulletin")}</li>
            ) : (
              station.recentBulletin.map((p) => (
                <li key={p.id} className="text-sm">
                  <Link
                    href={`/portal/circles/${p.circleId}?tab=bulletin`}
                    className="font-medium text-opseu-dark hover:underline"
                  >
                    {p.title}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </Card>
      </section>

      {searchCard}
    </div>
  );
}
