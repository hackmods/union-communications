"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import type { PortalSearchHit, StationPayload } from "@/types/portal";
import { canCreateCircle } from "@/lib/portal/access";
import type { UserRole } from "@/types/tenant";

export function PortalStation({ roles }: { roles: UserRole[] }) {
  const t = useTranslations("portal");
  const [station, setStation] = useState<StationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<"blank" | "lec" | "jhsc" | "campaign">(
    "blank",
  );
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PortalSearchHit[]>([]);
  const allowCreate = canCreateCircle(roles);

  const load = useCallback(async () => {
    const res = await fetch("/api/portal/station");
    if (!res.ok) {
      setError(t("loadError"));
      return;
    }
    const data = (await res.json()) as { station: StationPayload };
    setStation(data.station);
    setError(null);
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/portal/station")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(t("loadError"));
          return;
        }
        const data = (await res.json()) as { station: StationPayload };
        setStation(data.station);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError(t("loadError"));
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
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 3);
    const res = await fetch("/api/portal/circles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        kind: template === "campaign" ? "campaign" : "committee",
        template,
        frontStartsAt: start.toISOString(),
        frontEndsAt: end.toISOString(),
      }),
    });
    setCreating(false);
    if (res.ok) {
      setName("");
      setTemplate("blank");
      await load();
    }
  }

  if (error) {
    return <Callout>{error}</Callout>;
  }

  if (!station) {
    return <p className="text-gray-600">{t("loading")}</p>;
  }

  const overdueTotal = station.circles.reduce(
    (n, c) => n + c.overdueActions,
    0,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-opseu-dark">{t("stationTitle")}</h1>
          <p className="mt-1 max-w-prose text-gray-600">{t("stationSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/portal/dispatch"
            className="inline-flex min-h-11 items-center rounded-lg border-2 border-opseu-blue px-4 py-2 text-sm font-semibold text-opseu-blue"
          >
            {t("dispatchLink")}
            {station.dispatchUnread > 0 ? (
              <span className="ml-2 rounded-full bg-opseu-blue px-2 py-0.5 text-xs text-white">
                {station.dispatchUnread}
              </span>
            ) : null}
          </Link>
          <Link
            href="/portal/fronts"
            className="inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-semibold text-opseu-blue hover:bg-opseu-blue/5"
          >
            {t("frontsLink")}
          </Link>
          <Link
            href="/portal/sidebars"
            className="inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-semibold text-opseu-blue hover:bg-opseu-blue/5"
          >
            {t("sidebarsLink")}
          </Link>
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-semibold text-opseu-blue hover:bg-opseu-blue/5"
          >
            {t("hubLink")}
          </Link>
        </div>
      </div>

      <Callout tone="muted">
        {t("weekDigest", {
          bulletin: station.weekDigest.bulletinPosts,
          done: station.weekDigest.actionsCompleted,
          floor: station.weekDigest.floorMessages,
        })}
      </Callout>

      {overdueTotal > 0 ? (
        <Callout>{t("overdueBadge", { count: overdueTotal })}</Callout>
      ) : null}

      <div>
        <label className="text-sm font-medium text-gray-700">
          {t("searchLabel")}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="mt-1 min-h-11 w-full max-w-xl rounded-lg border border-gray-300 px-3"
          />
        </label>
        {displayHits.length > 0 ? (
          <ul className="mt-2 max-w-xl space-y-1 border-l-4 border-opseu-blue pl-3">
            {displayHits.map((h) => {
              const tab =
                h.kind === "action"
                  ? "actions"
                  : h.kind === "binder"
                    ? "binder"
                    : h.kind === "bulletin"
                      ? "bulletin"
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
      </div>

      <section>
        <h2 className="text-sm font-medium text-gray-700">{t("yourCircles")}</h2>
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
                  {c.overdueActions > 0
                    ? ` · ${t("overdueShort", { count: c.overdueActions })}`
                    : ""}
                  {c.dispatchUnread > 0
                    ? ` · ${t("unreadShort", { count: c.dispatchUnread })}`
                    : ""}
                </p>
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
      </section>

      {allowCreate ? (
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
        </form>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2">
        <div>
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
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-700">
            {t("recentBulletin")}
          </h2>
          <ul className="mt-2 space-y-2">
            {station.recentBulletin.map((p) => (
              <li key={p.id} className="text-sm">
                <Link
                  href={`/portal/circles/${p.circleId}?tab=bulletin`}
                  className="font-medium text-opseu-dark hover:underline"
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="text-sm text-gray-600">
        <Link
          href="/portal/send-feedback"
          className="font-semibold text-opseu-blue hover:underline"
        >
          {t("sendFeedbackLink")}
        </Link>
      </p>
    </div>
  );
}
