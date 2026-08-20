"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import type { CircleDetailPayload, PortalToolMute } from "@/types/portal";
import {
  canAdminCircle,
  canWriteCircle,
  isCircleGuest,
  PORTAL_TOOL_MUTES,
} from "@/lib/portal/access";
import {
  circleWorkspaceTabs,
  type CircleWorkspaceTab,
} from "@/components/portal/portal-nav-model";
import type { UserRole } from "@/types/tenant";
import { buildIcsEvent, downloadIcs } from "@/lib/calendar/ics";
import { DEMO_USERS } from "@/lib/auth/demo-users";
import { useSession } from "next-auth/react";
import { PortalRetryCallout } from "@/components/portal/PortalRetryCallout";

type Tab = CircleWorkspaceTab;

const ALL_TABS: Tab[] = [
  "bulletin",
  "actions",
  "calendar",
  "binder",
  "floor",
  "rollCall",
  "pipeline",
  "momentum",
  "oversight",
  "roster",
];

type Oversight = {
  overdue: { id: string; title: string }[];
  unassigned: { id: string; title: string }[];
  doneToday: { id: string; title: string }[];
  openCount: number;
};

export function CircleWorkspace({
  circleId,
  roles,
}: {
  circleId: string;
  roles: UserRole[];
}) {
  const t = useTranslations("portal");
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(
    tabParam && (ALL_TABS as string[]).includes(tabParam)
      ? (tabParam as Tab)
      : "bulletin",
  );

  const selectTab = useCallback((key: Tab) => {
    setTab(key);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", key);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, []);

  const [detail, setDetail] = useState<CircleDetailPayload | null>(null);
  const [oversight, setOversight] = useState<Oversight | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    body: "",
    progress: 50,
    assigneeId: "",
    dueAt: "",
    startsAt: "",
    location: "",
    externalUrl: "",
    cadence: "weekly" as "weekly" | "biweekly" | "monthly",
    frontStartsAt: "",
    frontEndsAt: "",
    csv: "",
  });
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {},
  );
  const [dragCardId, setDragCardId] = useState<string | null>(null);

  function resetDraft() {
    setDraft({
      title: "",
      body: "",
      progress: 50,
      assigneeId: "",
      dueAt: "",
      startsAt: "",
      location: "",
      externalUrl: "",
      cadence: "weekly",
      frontStartsAt: "",
      frontEndsAt: "",
      csv: "",
    });
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/circles/${circleId}`);
      if (!res.ok) {
        setError(t("loadError"));
        return;
      }
      const data = (await res.json()) as {
        detail: CircleDetailPayload;
        oversight: Oversight;
      };
      setDetail(data.detail);
      setOversight(data.oversight);
      setError(null);
    } catch {
      setError(t("loadError"));
    }
  }, [circleId, t]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/portal/circles/${circleId}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(t("loadError"));
          return;
        }
        const data = (await res.json()) as {
          detail: CircleDetailPayload;
          oversight: Oversight;
        };
        setDetail(data.detail);
        setOversight(data.oversight);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError(t("loadError"));
      });
    return () => {
      cancelled = true;
    };
  }, [circleId, t]);

  const visibleTabs = useMemo(() => {
    if (!detail) return ALL_TABS;
    return circleWorkspaceTabs({
      kind: detail.circle.kind,
      hasRollCall: detail.rollCallQuestions.length > 0,
      hasPipeline: Boolean(detail.pipelineBoard),
      hasMomentum: detail.momentum.length > 0,
    });
  }, [detail]);

  const activeTab = visibleTabs.includes(tab) ? tab : visibleTabs[0] ?? "bulletin";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key >= "1" && e.key <= "9") {
        const idx = Number(e.key) - 1;
        if (visibleTabs[idx]) {
          e.preventDefault();
          selectTab(visibleTabs[idx]);
        }
      }
      if (e.key === "0" && visibleTabs[9]) {
        e.preventDefault();
        selectTab(visibleTabs[9]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectTab, visibleTabs]);

  const canWrite = canWriteCircle(detail?.membership.role);
  const canAdmin = canAdminCircle(roles, detail?.membership.role);
  const isGuest = isCircleGuest(detail?.membership.role);

  async function postTool(payload: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/portal/circles/${circleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setWriteError(t("writeError"));
        return;
      }
      setWriteError(null);
      await load();
    } catch {
      setWriteError(t("writeError"));
    }
  }

  async function patchCircle(body: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/portal/circles/${circleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setWriteError(t("writeError"));
        return;
      }
      setWriteError(null);
      await load();
    } catch {
      setWriteError(t("writeError"));
    }
  }

  const filteredBulletin = useMemo(() => {
    if (!detail) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return detail.bulletin;
    return detail.bulletin.filter(
      (p) =>
        p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q),
    );
  }, [detail, filter]);

  const filteredActions = useMemo(() => {
    if (!detail) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return detail.actions;
    return detail.actions.filter((a) => a.title.toLowerCase().includes(q));
  }, [detail, filter]);

  if (error) {
    return <PortalRetryCallout message={error} onRetry={() => void load()} />;
  }
  if (!detail) return <p className="text-gray-600">{t("loading")}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-600">
            <Link href="/portal" className="text-opseu-blue hover:underline">
              {t("stationTitle")}
            </Link>
            {" / "}
            {t(`kind.${detail.circle.kind}`)}
          </p>
          <h1 className="text-2xl font-bold text-opseu-dark sm:text-3xl">
            {detail.circle.name}
          </h1>
          {isGuest ? (
            <Callout className="mt-2 max-w-prose" tone="warning">
              {t("guestBanner")}
            </Callout>
          ) : null}
          {detail.circle.description ? (
            <p className="mt-1 max-w-prose text-gray-600">
              {detail.circle.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              void patchCircle({ starred: !detail.membership.starred })
            }
          >
            {detail.membership.starred ? t("unstar") : t("star")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              void patchCircle({ muted: !detail.membership.muted })
            }
          >
            {detail.membership.muted ? t("unmute") : t("mute")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void (async () => {
                const res = await fetch(`/api/portal/circles/${circleId}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tool: "activity_pack" }),
                });
                if (!res.ok) return;
                const data = (await res.json()) as { pack: unknown };
                const blob = new Blob([JSON.stringify(data.pack, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${detail.circle.name.replace(/\s+/g, "-").toLowerCase()}-activity-pack.json`;
                a.click();
                URL.revokeObjectURL(url);
              })();
            }}
          >
            {t("downloadActivityPack")}
          </Button>
          {canAdmin ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void patchCircle({ archive: true })}
            >
              {t("archive")}
            </Button>
          ) : null}
        </div>
      </div>

      <details className="rounded-lg border border-gray-200 p-3 text-sm">
        <summary className="cursor-pointer font-medium text-opseu-dark">
          {t("muteToolsTitle")}
        </summary>
        <p className="mt-1 text-gray-600">{t("muteToolsHint")}</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {PORTAL_TOOL_MUTES.map((tool) => {
            const on = (detail.membership.mutedTools ?? []).includes(tool);
            return (
              <label key={tool} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => {
                    const current = detail.membership.mutedTools ?? [];
                    const next: PortalToolMute[] = on
                      ? current.filter((x) => x !== tool)
                      : [...current, tool];
                    void patchCircle({ mutedTools: next });
                  }}
                />
                {t(`muteTool.${tool}`)}
              </label>
            );
          })}
        </div>
      </details>

      {canAdmin ? (
        <details className="rounded-lg border border-gray-200 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-opseu-dark">
            {t("frontsSettings")}
          </summary>
          <p className="mt-1 text-gray-600">{t("frontsSettingsHint")}</p>
          <form
            className="mt-3 flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void postTool({
                tool: "set_fronts",
                frontStartsAt: (() => {
                  const raw =
                    draft.frontStartsAt ||
                    detail.circle.frontStartsAt?.slice(0, 10);
                  return raw ? new Date(raw).toISOString() : undefined;
                })(),
                frontEndsAt: (() => {
                  const raw =
                    draft.frontEndsAt ||
                    detail.circle.frontEndsAt?.slice(0, 10);
                  return raw ? new Date(raw).toISOString() : undefined;
                })(),
              }).then(() => resetDraft());
            }}
          >
            <label className="text-xs text-gray-600">
              {t("frontStartsAt")}
              <input
                type="date"
                className="mt-1 block min-h-11 rounded-lg border border-gray-300 px-2"
                value={
                  draft.frontStartsAt ||
                  (detail.circle.frontStartsAt
                    ? detail.circle.frontStartsAt.slice(0, 10)
                    : "")
                }
                onChange={(e) =>
                  setDraft((d) => ({ ...d, frontStartsAt: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-gray-600">
              {t("frontEndsAt")}
              <input
                type="date"
                className="mt-1 block min-h-11 rounded-lg border border-gray-300 px-2"
                value={
                  draft.frontEndsAt ||
                  (detail.circle.frontEndsAt
                    ? detail.circle.frontEndsAt.slice(0, 10)
                    : "")
                }
                onChange={(e) =>
                  setDraft((d) => ({ ...d, frontEndsAt: e.target.value }))
                }
              />
            </label>
            <Button type="submit" size="sm" variant="outline">
              {t("saveFronts")}
            </Button>
          </form>
        </details>
      ) : null}

      {canAdmin ? (
        <details className="rounded-lg border border-gray-200 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-opseu-dark">
            {t("importTitle")}
          </summary>
          <p className="mt-1 text-gray-600">{t("importHint")}</p>
          <form
            className="mt-2 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.csv.trim()) return;
              void postTool({ tool: "import_csv", csv: draft.csv }).then(() =>
                resetDraft(),
              );
            }}
          >
            <textarea
              className="min-h-28 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
              placeholder={t("importPlaceholder")}
              value={draft.csv}
              onChange={(e) =>
                setDraft((d) => ({ ...d, csv: e.target.value }))
              }
            />
            <Button type="submit" size="sm">
              {t("importSubmit")}
            </Button>
          </form>
        </details>
      ) : null}

      {writeError ? (
        <Callout tone="warning">
          {writeError}
        </Callout>
      ) : null}

      <Card density="compact" className="space-y-4">
      <div
        role="tablist"
        aria-label={t("toolsNav")}
        className="sticky z-30 top-[calc(var(--site-header-height,3.5rem)+3.25rem)] flex flex-nowrap gap-1 overflow-x-auto overscroll-x-contain border-b border-gray-200 bg-white pb-2"
      >
        {visibleTabs.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            className={`min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold ${
              activeTab === key
                ? "bg-opseu-blue text-white"
                : "text-opseu-blue hover:bg-opseu-blue/5"
            }`}
            onClick={() => selectTab(key)}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">{t("keyboardHint")}</p>

      {(activeTab === "bulletin" || activeTab === "actions") && (
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("filterPlaceholder")}
          className="min-h-11 w-full max-w-md rounded-lg border border-gray-300 px-3"
          aria-label={t("filterPlaceholder")}
        />
      )}

      {activeTab === "bulletin" && (
        <div className="space-y-4">
          {canWrite ? (
            <form
              className="space-y-2"
              aria-label={t("writeBulletin")}
              onSubmit={(e) => {
                e.preventDefault();
                void postTool({
                  tool: "bulletin",
                  title: draft.title,
                  body: draft.body,
                }).then(() => resetDraft());
              }}
            >
              <input
                className="min-h-11 w-full rounded-lg border border-gray-300 px-3"
                placeholder={t("bulletinTitle")}
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
              />
              <textarea
                className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder={t("bulletinBody")}
                value={draft.body}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, body: e.target.value }))
                }
              />
              <p className="text-xs text-gray-500">{t("mentionHint")}</p>
              <Button type="submit">{t("postBulletin")}</Button>
            </form>
          ) : null}
          {filteredBulletin.length === 0 ? (
            <p className="text-sm text-gray-500">{t("emptyCircleBulletin")}</p>
          ) : null}
          <ul className="space-y-4">
            {filteredBulletin.map((p) => (
              <li key={p.id} className="border-l-4 border-opseu-blue pl-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-opseu-dark">
                      {p.pinned ? "📌 " : ""}
                      {p.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {p.authorName} ·{" "}
                      {new Date(p.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-gray-800">
                      {p.body}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canAdmin ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void postTool({
                            tool: "pin_bulletin",
                            postId: p.id,
                            pinned: !p.pinned,
                          })
                        }
                      >
                        {p.pinned ? t("unpin") : t("pin")}
                      </Button>
                    ) : null}
                    {canWrite ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void postTool({
                            tool: "action",
                            title: p.title,
                            listName: "From Bulletin",
                            sourceBulletinPostId: p.id,
                          })
                        }
                      >
                        {t("promoteToAction")}
                      </Button>
                    ) : null}
                    {canWrite ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void postTool({
                            tool: "soft_delete",
                            resourceType: "bulletin",
                            resourceId: p.id,
                          })
                        }
                      >
                        {t("softDelete")}
                      </Button>
                    ) : null}
                  </div>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  {detail.comments
                    .filter((c) => c.postId === p.id)
                    .map((c) => (
                      <li key={c.id}>
                        <span className="font-medium">{c.authorName}:</span>{" "}
                        {c.body}
                      </li>
                    ))}
                </ul>
                {canWrite ? (
                  <form
                    className="mt-2 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const body = commentDrafts[p.id]?.trim();
                      if (!body) return;
                      void postTool({
                        tool: "comment",
                        postId: p.id,
                        body,
                      }).then(() =>
                        setCommentDrafts((d) => ({ ...d, [p.id]: "" })),
                      );
                    }}
                  >
                    <input
                      className="min-h-11 flex-1 rounded-lg border border-gray-300 px-3 text-sm"
                      placeholder={t("commentPlaceholder")}
                      value={commentDrafts[p.id] ?? ""}
                      onChange={(e) =>
                        setCommentDrafts((d) => ({
                          ...d,
                          [p.id]: e.target.value,
                        }))
                      }
                    />
                    <Button type="submit" size="sm">
                      {t("addComment")}
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === "actions" && (
        <div className="space-y-4">
          {canWrite ? (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const assignee = detail.roster.find(
                  (m) => m.userId === draft.assigneeId,
                );
                void postTool({
                  tool: "action",
                  title: draft.title,
                  listName: "Actions",
                  assigneeId: assignee?.userId,
                  assigneeName: assignee?.userName,
                  dueAt: draft.dueAt
                    ? new Date(draft.dueAt).toISOString()
                    : undefined,
                }).then(() => resetDraft());
              }}
            >
              <input
                className="min-h-11 min-w-[12rem] flex-1 rounded-lg border border-gray-300 px-3"
                placeholder={t("actionTitle")}
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
              />
              <select
                className="min-h-11 rounded-lg border border-gray-300 px-2"
                value={draft.assigneeId}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, assigneeId: e.target.value }))
                }
                aria-label={t("assigneeLabel")}
              >
                <option value="">{t("unassigned")}</option>
                {detail.roster.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.userName}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="min-h-11 rounded-lg border border-gray-300 px-2"
                value={draft.dueAt}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, dueAt: e.target.value }))
                }
                aria-label={t("dueAtLabel")}
              />
              <Button type="submit">{t("addAction")}</Button>
            </form>
          ) : null}
          <ul className="space-y-2">
            {filteredActions.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 py-2"
              >
                <div>
                  <span
                    className={
                      a.completedAt ? "text-gray-400 line-through" : ""
                    }
                  >
                    {a.title}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    {a.assigneeName ?? t("unassigned")}
                    {a.dueAt
                      ? ` · ${new Date(a.dueAt).toLocaleDateString()}`
                      : ""}
                  </span>
                </div>
                {canWrite && !a.completedAt ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void postTool({
                        tool: "complete_action",
                        actionId: a.id,
                      })
                    }
                  >
                    {t("complete")}
                  </Button>
                ) : null}
                {canWrite ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void postTool({
                        tool: "soft_delete",
                        resourceType: "action",
                        resourceId: a.id,
                      })
                    }
                  >
                    {t("softDelete")}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === "calendar" && (
        <div className="space-y-4">
          {canWrite ? (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                const startsAt = draft.startsAt
                  ? new Date(draft.startsAt).toISOString()
                  : (() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 3);
                      return d.toISOString();
                    })();
                void postTool({
                  tool: "calendar",
                  title: draft.title || t("defaultEvent"),
                  startsAt,
                  body: draft.body,
                  location: draft.location.trim() || undefined,
                  externalUrl: draft.externalUrl.trim() || undefined,
                }).then(() => resetDraft());
              }}
            >
              <input
                className="min-h-11 w-full rounded-lg border border-gray-300 px-3"
                placeholder={t("eventTitle")}
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
              />
              <div className="flex flex-wrap gap-2">
                <input
                  type="datetime-local"
                  className="min-h-11 rounded-lg border border-gray-300 px-2"
                  value={draft.startsAt}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, startsAt: e.target.value }))
                  }
                  aria-label={t("eventStartsAt")}
                />
                <input
                  className="min-h-11 min-w-[10rem] flex-1 rounded-lg border border-gray-300 px-3"
                  placeholder={t("eventLocation")}
                  value={draft.location}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, location: e.target.value }))
                  }
                />
                <input
                  className="min-h-11 min-w-[12rem] flex-1 rounded-lg border border-gray-300 px-3"
                  placeholder={t("eventExternalUrl")}
                  value={draft.externalUrl}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, externalUrl: e.target.value }))
                  }
                />
              </div>
              <Button type="submit">{t("addEvent")}</Button>
            </form>
          ) : null}
          <ul className="space-y-2">
            {detail.calendar.map((ev) => (
              <li
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <div>
                  <span className="font-semibold">{ev.title}</span>
                  {" · "}
                  {new Date(ev.startsAt).toLocaleString()}
                  {ev.location ? ` · ${ev.location}` : ""}
                  {ev.externalUrl ? (
                    <>
                      {" · "}
                      <a
                        href={ev.externalUrl}
                        className="text-opseu-blue underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("rsvpLink")}
                      </a>
                    </>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const ends =
                      ev.endsAt ??
                      new Date(
                        new Date(ev.startsAt).getTime() + 60 * 60 * 1000,
                      ).toISOString();
                    const ics = buildIcsEvent({
                      uid: `${ev.id}@unionops.portal`,
                      title: ev.title,
                      description: ev.description,
                      location: ev.location,
                      startsAt: ev.startsAt,
                      endsAt: ends,
                    });
                    downloadIcs(`${ev.id}.ics`, ics);
                  }}
                >
                  {t("downloadIcs")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === "binder" && (
        <div className="space-y-4">
          {canWrite ? (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void postTool({
                  tool: "binder",
                  title: draft.title,
                  content: draft.body,
                  contentType: "note",
                }).then(() => resetDraft());
              }}
            >
              <input
                className="min-h-11 w-full rounded-lg border border-gray-300 px-3"
                placeholder={t("binderTitle")}
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
              />
              <textarea
                className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder={t("binderBody")}
                value={draft.body}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, body: e.target.value }))
                }
              />
              <Button type="submit">{t("addBinder")}</Button>
            </form>
          ) : null}
          <ul className="space-y-3">
            {detail.binder.map((b) => (
              <li key={b.id} className="border-l-4 border-gray-300 pl-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{b.title}</h3>
                    {b.folder ? (
                      <p className="text-xs text-gray-500">{b.folder}</p>
                    ) : null}
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                      {b.content}
                    </p>
                  </div>
                  {canWrite ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void postTool({
                          tool: "soft_delete",
                          resourceType: "binder",
                          resourceId: b.id,
                        })
                      }
                    >
                      {t("softDelete")}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === "floor" && (
        <div className="space-y-4">
          <ul className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
            {detail.floor.length === 0 ? (
              <li className="text-sm text-gray-500">{t("emptyFloor")}</li>
            ) : (
              detail.floor.map((m) => (
              <li key={m.id} className="text-sm">
                <span className="font-medium">{m.authorName}</span>
                <span className="text-gray-500">
                  {" "}
                  · {new Date(m.createdAt).toLocaleTimeString()}
                </span>
                <p>{m.body}</p>
              </li>
              ))
            )}
          </ul>
          {canWrite ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void postTool({ tool: "floor", body: draft.body }).then(() =>
                  resetDraft(),
                );
              }}
            >
              <input
                className="min-h-11 flex-1 rounded-lg border border-gray-300 px-3"
                placeholder={t("floorPlaceholder")}
                value={draft.body}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, body: e.target.value }))
                }
              />
              <Button type="submit">{t("sendFloor")}</Button>
            </form>
          ) : null}
        </div>
      )}

      {activeTab === "rollCall" && (
        <div className="space-y-4">
          {canAdmin ? (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.title.trim()) return;
                void postTool({
                  tool: "roll_call_question",
                  title: draft.title.trim(),
                  cadence: draft.cadence,
                }).then(() => resetDraft());
              }}
            >
              <input
                className="min-h-11 min-w-[12rem] flex-1 rounded-lg border border-gray-300 px-3"
                placeholder={t("newRollCallQuestion")}
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
              />
              <select
                className="min-h-11 rounded-lg border border-gray-300 px-2"
                value={draft.cadence}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    cadence: e.target.value as typeof d.cadence,
                  }))
                }
                aria-label={t("cadenceLabel")}
              >
                <option value="weekly">{t("cadence.weekly")}</option>
                <option value="biweekly">{t("cadence.biweekly")}</option>
                <option value="monthly">{t("cadence.monthly")}</option>
              </select>
              <Button type="submit">{t("addRollCallQuestion")}</Button>
            </form>
          ) : null}
          {detail.rollCallQuestions.map((q) => (
            <div key={q.id} className="border-l-4 border-opseu-blue pl-4">
              <h3 className="font-semibold">{q.question}</h3>
              <p className="text-xs text-gray-500">{q.cadence}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {detail.rollCallAnswers
                  .filter((a) => a.questionId === q.id)
                  .map((a) => (
                    <li key={a.id}>
                      <span className="font-medium">{a.authorName}:</span>{" "}
                      {a.body}
                    </li>
                  ))}
              </ul>
              {canWrite ? (
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void postTool({
                      tool: "roll_call",
                      questionId: q.id,
                      body: draft.body,
                    }).then(() => resetDraft());
                  }}
                >
                  <input
                    className="min-h-11 flex-1 rounded-lg border border-gray-300 px-3"
                    placeholder={t("rollCallAnswer")}
                    value={draft.body}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, body: e.target.value }))
                    }
                  />
                  <Button type="submit">{t("submitAnswer")}</Button>
                </form>
              ) : null}
            </div>
          ))}
          {detail.rollCallQuestions.length === 0 ? (
            <p className="text-sm text-gray-500">{t("noRollCall")}</p>
          ) : null}
        </div>
      )}

      {activeTab === "pipeline" && (
        <div className="space-y-4">
          {!detail.pipelineBoard ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">{t("noPipeline")}</p>
              {canAdmin ? (
                <Button
                  type="button"
                  onClick={() => void postTool({ tool: "pipeline_board" })}
                >
                  {t("startPipeline")}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {detail.pipelineColumns.map((col) => (
                <div
                  key={col.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                  onDragOver={(e) => {
                    if (!canWrite) return;
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!canWrite || !dragCardId) return;
                    void postTool({
                      tool: "pipeline_move",
                      cardId: dragCardId,
                      columnId: col.id,
                    }).then(() => setDragCardId(null));
                  }}
                >
                  <h3 className="text-sm font-semibold">{col.name}</h3>
                  <ul className="mt-2 space-y-2">
                    {detail.pipelineCards
                      .filter((c) => c.columnId === col.id)
                      .map((card) => (
                        <li
                          key={card.id}
                          draggable={canWrite}
                          onDragStart={() => setDragCardId(card.id)}
                          onDragEnd={() => setDragCardId(null)}
                          className="cursor-grab rounded bg-white p-2 text-sm shadow-sm active:cursor-grabbing"
                        >
                          {card.title}
                          {canWrite ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {detail.pipelineColumns
                                .filter((c) => c.id !== col.id)
                                .map((target) => (
                                  <button
                                    key={target.id}
                                    type="button"
                                    className="text-xs text-opseu-blue underline"
                                    onClick={() =>
                                      void postTool({
                                        tool: "pipeline_move",
                                        cardId: card.id,
                                        columnId: target.id,
                                      })
                                    }
                                  >
                                    → {target.name}
                                  </button>
                                ))}
                            </div>
                          ) : null}
                        </li>
                      ))}
                  </ul>
                  {canWrite ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() =>
                        void postTool({
                          tool: "pipeline_card",
                          boardId: detail.pipelineBoard!.id,
                          columnId: col.id,
                          title: t("newCard"),
                        })
                      }
                    >
                      {t("addCard")}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "momentum" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t("momentumHint")}</p>
          {canWrite ? (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void postTool({
                  tool: "momentum",
                  title: draft.title,
                  notes: draft.body,
                  progress: draft.progress,
                }).then(() => resetDraft());
              }}
            >
              <input
                className="min-h-11 w-full rounded-lg border border-gray-300 px-3"
                placeholder={t("momentumTitle")}
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
              />
              <label className="block text-sm">
                {t("momentumProgress", { value: draft.progress })}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={draft.progress}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      progress: Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full"
                />
              </label>
              <Button type="submit">{t("saveMomentum")}</Button>
            </form>
          ) : null}
          <ul className="space-y-4">
            {detail.momentum.map((m) => (
              <li key={m.id} className="border-l-4 border-opseu-blue pl-4">
                <h3 className="font-semibold">{m.title}</h3>
                {m.notes ? (
                  <p className="text-sm text-gray-600">{m.notes}</p>
                ) : null}
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-3 rounded-full bg-opseu-blue"
                    style={{ width: `${m.progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {m.progress}% · {m.updatedByName} ·{" "}
                  {m.progress < 50
                    ? t("momentumUphill")
                    : t("momentumDownhill")}
                </p>
                {canWrite ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[25, 50, 75, 100].map((p) => (
                      <Button
                        key={p}
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void postTool({
                            tool: "momentum",
                            momentumId: m.id,
                            title: m.title,
                            notes: m.notes,
                            progress: p,
                          })
                        }
                      >
                        {p}%
                      </Button>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
            {detail.momentum.length === 0 ? (
              <li className="text-sm text-gray-500">{t("momentumEmpty")}</li>
            ) : null}
          </ul>
        </div>
      )}

      {activeTab === "oversight" && oversight && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-medium text-gray-700">
              {t("oversightOverdue")}
            </h3>
            <ul className="mt-2 text-sm">
              {oversight.overdue.map((a) => (
                <li key={a.id}>{a.title}</li>
              ))}
              {oversight.overdue.length === 0 ? (
                <li className="text-gray-500">{t("none")}</li>
              ) : null}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700">
              {t("oversightUnassigned")}
            </h3>
            <ul className="mt-2 text-sm">
              {oversight.unassigned.map((a) => (
                <li key={a.id}>{a.title}</li>
              ))}
              {oversight.unassigned.length === 0 ? (
                <li className="text-gray-500">{t("none")}</li>
              ) : null}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700">
              {t("oversightDoneToday")}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {t("openCount", { count: oversight.openCount })}
            </p>
            <ul className="mt-2 text-sm">
              {oversight.doneToday.map((a) => (
                <li key={a.id}>{a.title}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {activeTab === "roster" && (
        <div className="space-y-4">
          <ul className="space-y-2">
            {detail.roster.map((m) => (
              <li key={m.id} className="text-sm">
                <span className="font-medium">{m.userName}</span>
                {" · "}
                {t(`roles.${m.role}`)}
                {m.muted ? ` · ${t("muted")}` : ""}
              </li>
            ))}
          </ul>
          {canAdmin ? (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const peer = DEMO_USERS.find((u) => u.id === draft.title);
                if (!peer) return;
                void postTool({
                  tool: "roster_invite",
                  userId: peer.id,
                  userName: peer.name,
                }).then(() => resetDraft());
              }}
            >
              <select
                className="min-h-11 rounded-lg border border-gray-300 px-2"
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
              >
                <option value="">{t("rosterInvitePick")}</option>
                {DEMO_USERS.filter(
                  (u) =>
                    u.unionId === session?.user?.unionId &&
                    !detail.roster.some((r) => r.userId === u.id),
                ).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm">
                {t("rosterInvite")}
              </Button>
            </form>
          ) : null}
        </div>
      )}
      </Card>
    </div>
  );
}
