"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { getTenantContext } from "@/lib/tenant/loader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Callout } from "@/components/ui/Callout";
import { useMfaEnabled, useSessionMfaOk } from "@/components/hub/MfaPolicyProvider";
import { PROPOSAL_STATUSES, type ProposalStatus } from "@/lib/proposal-tracker/types";
import type {
  HubProposalEvent,
  HubProposalPackage,
  HubProposalPackageStatus,
  HubProposalRow,
  ProposalPublication,
} from "@/types/hub-proposals";
import type { UserRole } from "@/types/tenant";

const WRITE_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "local_president",
  "local_exec",
  "solo_account",
];

const PACKAGE_STATUSES: HubProposalPackageStatus[] = [
  "active",
  "closed",
  "archived",
];

const STATUS_BADGE: Record<ProposalStatus, "default" | "success" | "warning" | "danger" | "muted"> = {
  open: "default",
  tentativelyAgreed: "success",
  unionWithdrew: "warning",
  employerWithdrew: "warning",
  impasse: "danger",
};

const PACKAGE_BADGE: Record<HubProposalPackageStatus, "default" | "warning" | "muted"> = {
  active: "default",
  closed: "warning",
  archived: "muted",
};

function EventBadge({ kind }: { kind: HubProposalEvent["kind"] }) {
  const t = useTranslations("hubProposals");
  const variant: "info" | "default" | "muted" =
    kind === "comment" ? "info" : kind === "status" ? "default" : "muted";
  return <Badge variant={variant}>{t(`eventKind.${kind}`)}</Badge>;
}

export function ProposalPackageWorkspace({ packageId }: { packageId: string }) {
  const t = useTranslations("hubProposals");
  const { data: session } = useSession();
  const mfaEnabled = useMfaEnabled();
  const mfaOk = useSessionMfaOk();
  const router = useRouter();

  const [pkg, setPkg] = useState<HubProposalPackage | null>(null);
  const [rows, setRows] = useState<HubProposalRow[]>([]);
  const [events, setEvents] = useState<HubProposalEvent[]>([]);
  const [publications, setPublications] = useState<ProposalPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [meta, setMeta] = useState({
    name: "",
    roundLabel: "",
    status: "active" as HubProposalPackageStatus,
    caucusNote: "",
  });
  const [metaDirty, setMetaDirty] = useState(false);

  const [comment, setComment] = useState("");
  const [publishHeadline, setPublishHeadline] = useState("");
  const [publishBullets, setPublishBullets] = useState("");
  const [publishHref, setPublishHref] = useState("");

  const roles = (session?.user?.roles ?? []) as UserRole[];
  const tenant =
    session?.user?.unionId
      ? getTenantContext(session.user.unionId, session.user.localId)
      : null;
  const proposalsEnabled = tenant?.union.enabledModules.includes("proposals") ?? false;
  const mfaBlocked = mfaEnabled && !mfaOk;
  const canWrite =
    !mfaBlocked && proposalsEnabled && roles.some((r) => WRITE_ROLES.includes(r));

  const load = useCallback(async () => {
    const res = await fetch(`/api/proposals/${packageId}`);
    if (!res.ok) {
      setLoadError(t("loadError"));
      return false;
    }
    const data = (await res.json()) as {
      package: HubProposalPackage;
      rows: HubProposalRow[];
      events: HubProposalEvent[];
      publications: ProposalPublication[];
    };
    setPkg(data.package);
    setRows(data.rows);
    setEvents(data.events);
    setPublications(data.publications);
    setMeta({
      name: data.package.name,
      roundLabel: data.package.roundLabel,
      status: data.package.status,
      caucusNote: data.package.caucusNote,
    });
    setMetaDirty(false);
    return true;
  }, [packageId, t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ok = await load();
        if (cancelled) return;
        if (!ok) setLoadError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, t]);

  const rowsById = useMemo(
    () => new Map(rows.map((r) => [r.id, r])),
    [rows],
  );

  function flash(messageKey: string) {
    setMessage(t(messageKey));
    window.setTimeout(() => setMessage(null), 3000);
  }

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!meta.name.trim()) return;
    const res = await fetch(`/api/proposals/${packageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: meta.name.trim(),
        roundLabel: meta.roundLabel.trim(),
        status: meta.status,
        caucusNote: meta.caucusNote.trim(),
      }),
    });
    if (res.ok) {
      flash("saved");
      await load();
    } else {
      setLoadError(t("saveError"));
    }
  }

  async function patchRow(row: HubProposalRow, patch: Partial<HubProposalRow>) {
    const next = { ...row, ...patch };
    setRows((prev) => prev.map((r) => (r.id === row.id ? next : r)));
  }

  async function commitRow(rowId: string) {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    const res = await fetch(`/api/proposals/${packageId}/rows/${rowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        article: row.article,
        currentLanguage: row.currentLanguage,
        unionProposal: row.unionProposal,
        employerCounter: row.employerCounter,
        status: row.status,
        notes: row.notes,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { row: HubProposalRow };
      setRows((prev) => prev.map((r) => (r.id === rowId ? data.row : r)));
      const detailRes = await fetch(`/api/proposals/${packageId}`);
      if (detailRes.ok) {
        const data2 = (await detailRes.json()) as { events: HubProposalEvent[] };
        setEvents(data2.events);
      }
    } else {
      setLoadError(t("saveError"));
    }
  }

  async function changeRowStatus(row: HubProposalRow, status: ProposalStatus) {
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, status } : r)),
    );
    const res = await fetch(`/api/proposals/${packageId}/rows/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = (await res.json()) as { row: HubProposalRow };
      setRows((prev) => prev.map((r) => (r.id === row.id ? data.row : r)));
      const detailRes = await fetch(`/api/proposals/${packageId}`);
      if (detailRes.ok) {
        const data2 = (await detailRes.json()) as { events: HubProposalEvent[] };
        setEvents(data2.events);
      }
    } else {
      setLoadError(t("saveError"));
    }
  }

  async function addRow() {
    if (!pkg) return;
    const res = await fetch(`/api/proposals/${packageId}/rows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sortOrder: rows.length,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { row: HubProposalRow };
      setRows((prev) => [...prev, data.row]);
      flash("rowAdded");
    } else {
      setLoadError(t("saveError"));
    }
  }

  async function removeRow(rowId: string) {
    const res = await fetch(`/api/proposals/${packageId}/rows/${rowId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== rowId));
      flash("rowRemoved");
    } else {
      setLoadError(t("saveError"));
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    const res = await fetch(`/api/proposals/${packageId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "comment", body: comment.trim() }),
    });
    if (res.ok) {
      setComment("");
      await load();
    } else {
      setLoadError(t("saveError"));
    }
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!publishHeadline.trim()) return;
    const bullets = publishBullets
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);
    const res = await fetch(`/api/proposals/${packageId}/publications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: publishHeadline.trim(),
        bullets,
        guideHref: publishHref.trim() || undefined,
      }),
    });
    if (res.ok) {
      flash("published");
      setPublishHeadline("");
      setPublishBullets("");
      setPublishHref("");
      await load();
    } else {
      setLoadError(t("saveError"));
    }
  }

  async function unpublish(publicationId: string) {
    const res = await fetch(`/api/proposals/publications/${publicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) {
      flash("unpublished");
      await load();
    } else {
      setLoadError(t("saveError"));
    }
  }

  async function deletePackage() {
    if (!pkg) return;
    const res = await fetch(`/api/proposals/${packageId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/app/proposals");
    } else {
      setLoadError(t("saveError"));
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-busy="true" aria-label={t("loading")}>
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (loadError && !pkg) {
    return (
      <div className="space-y-4">
        <Callout tone="warning">
          <p>{loadError}</p>
        </Callout>
        <Link href="/app/proposals" className="text-sm font-semibold text-opseu-blue underline">
          {t("backToList")}
        </Link>
      </div>
    );
  }

  if (!pkg) return null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-opseu-dark">{pkg.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={PACKAGE_BADGE[pkg.status]}>
              {t(`packageStatus.${pkg.status}`)}
            </Badge>
            {pkg.publishedSummary ? (
              <Badge variant="success">{t("liveOnPortal")}</Badge>
            ) : null}
            <span className="text-xs text-gray-500">
              {t("updatedLabel", {
                date: new Date(pkg.updatedAt).toLocaleString(),
              })}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/proposals"
            className="inline-flex min-h-9 items-center rounded-md border border-gray-300 px-3 text-sm font-medium text-opseu-dark hover:bg-gray-50"
          >
            {t("backToList")}
          </Link>
          {canWrite ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => void deletePackage()}>
              {t("deletePackage")}
            </Button>
          ) : null}
        </div>
      </div>

      {message && (
        <p className="mt-3 text-sm text-green-800" role="status">
          {message}
        </p>
      )}
      {loadError && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {loadError}
        </p>
      )}

      {canWrite && (
        <form
          onSubmit={(e) => void saveMeta(e)}
          className="mt-5 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">{t("colName")}</span>
            <Input
              value={meta.name}
              onChange={(e) => {
                setMeta({ ...meta, name: e.target.value });
                setMetaDirty(true);
              }}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">{t("colRound")}</span>
            <Input
              value={meta.roundLabel}
              placeholder={t("roundPlaceholder")}
              onChange={(e) => {
                setMeta({ ...meta, roundLabel: e.target.value });
                setMetaDirty(true);
              }}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">{t("colStatus")}</span>
            <Select
              value={meta.status}
              onChange={(e) => {
                setMeta({ ...meta, status: e.target.value as HubProposalPackageStatus });
                setMetaDirty(true);
              }}
            >
              {PACKAGE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`packageStatus.${s}`)}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-gray-700">{t("colCaucusNote")}</span>
            <Textarea
              rows={2}
              value={meta.caucusNote}
              placeholder={t("caucusPlaceholder")}
              onChange={(e) => {
                setMeta({ ...meta, caucusNote: e.target.value });
                setMetaDirty(true);
              }}
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={!metaDirty}>
              {t("save")}
            </Button>
          </div>
        </form>
      )}

      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-opseu-dark">{t("rowsTitle")}</h2>
          {canWrite ? (
            <Button type="button" variant="outline" size="sm" onClick={() => void addRow()}>
              {t("addRow")}
            </Button>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <EmptyState className="mt-3" title={t("rowsEmpty")} />
        ) : (
          <div className="mt-3 min-w-0 w-full max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-gray-200 bg-white">
            <table className="min-w-[64rem] w-full border-collapse text-left text-sm">
              <thead className="bg-gray-50 text-opseu-dark">
                <tr>
                  <th scope="col" className="min-w-[9rem] px-3 py-2 font-semibold">
                    {t("rowCols.article")}
                  </th>
                  <th scope="col" className="min-w-[13rem] px-3 py-2 font-semibold">
                    {t("rowCols.currentLanguage")}
                  </th>
                  <th scope="col" className="min-w-[13rem] px-3 py-2 font-semibold">
                    {t("rowCols.unionProposal")}
                  </th>
                  <th scope="col" className="min-w-[13rem] px-3 py-2 font-semibold">
                    {t("rowCols.employerCounter")}
                  </th>
                  <th scope="col" className="min-w-[11rem] px-3 py-2 font-semibold">
                    {t("rowCols.status")}
                  </th>
                  <th scope="col" className="min-w-[12rem] px-3 py-2 font-semibold">
                    {t("rowCols.notes")}
                  </th>
                  <th scope="col" className="w-20 px-3 py-2 font-semibold">
                    {t("rowCols.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-200 align-top">
                    <td className="px-2 py-2">
                      <Input
                        aria-label={t("rowCols.article")}
                        value={row.article}
                        disabled={!canWrite}
                        onChange={(e) => void patchRow(row, { article: e.target.value })}
                        onBlur={() => void commitRow(row.id)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Textarea
                        aria-label={t("rowCols.currentLanguage")}
                        value={row.currentLanguage}
                        rows={3}
                        disabled={!canWrite}
                        onChange={(e) =>
                          void patchRow(row, { currentLanguage: e.target.value })
                        }
                        onBlur={() => void commitRow(row.id)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Textarea
                        aria-label={t("rowCols.unionProposal")}
                        value={row.unionProposal}
                        rows={3}
                        disabled={!canWrite}
                        onChange={(e) =>
                          void patchRow(row, { unionProposal: e.target.value })
                        }
                        onBlur={() => void commitRow(row.id)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Textarea
                        aria-label={t("rowCols.employerCounter")}
                        value={row.employerCounter}
                        rows={3}
                        disabled={!canWrite}
                        onChange={(e) =>
                          void patchRow(row, { employerCounter: e.target.value })
                        }
                        onBlur={() => void commitRow(row.id)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="space-y-1">
                        <Badge variant={STATUS_BADGE[row.status]}>
                          {t(`rowStatus.${row.status}`)}
                        </Badge>
                        <Select
                          aria-label={t("rowCols.status")}
                          value={row.status}
                          disabled={!canWrite}
                          onChange={(e) =>
                            void changeRowStatus(row, e.target.value as ProposalStatus)
                          }
                        >
                          {PROPOSAL_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {t(`rowStatus.${status}`)}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <Textarea
                        aria-label={t("rowCols.notes")}
                        value={row.notes}
                        rows={3}
                        disabled={!canWrite}
                        onChange={(e) => void patchRow(row, { notes: e.target.value })}
                        onBlur={() => void commitRow(row.id)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      {canWrite ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-sm"
                          onClick={() => void removeRow(row.id)}
                        >
                          {t("removeRow")}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-opseu-dark">{t("timelineTitle")}</h2>
          {events.length === 0 ? (
            <EmptyState className="mt-3" title={t("timelineEmpty")} />
          ) : (
            <ul className="mt-3 space-y-3">
              {events.map((event) => (
                <li key={event.id} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <EventBadge kind={event.kind} />
                    <span className="text-xs font-semibold text-opseu-dark">
                      {event.authorName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {event.rowId && rowsById.get(event.rowId) ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {t("eventRowPrefix")}{" "}
                      {rowsById.get(event.rowId)?.article || t("eventRowUnnamed")}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm whitespace-pre-wrap text-gray-700">
                    {event.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {canWrite ? (
            <form onSubmit={(e) => void submitComment(e)} className="mt-3 space-y-2">
              <Textarea
                aria-label={t("commentLabel")}
                value={comment}
                rows={3}
                placeholder={t("commentPlaceholder")}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button type="submit" disabled={!comment.trim()}>
                {t("postComment")}
              </Button>
            </form>
          ) : null}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-opseu-dark">{t("publishTitle")}</h2>
          <Callout tone="muted" className="mt-2">
            <p className="text-sm text-gray-700">{t("publishNote")}</p>
          </Callout>

          {publications.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {publications.map((pub) => (
                <li key={pub.id} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="success">{t("liveOnPortal")}</Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(pub.publishedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-opseu-dark">{pub.headline}</p>
                  {pub.bullets.length > 0 ? (
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
                      {pub.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  ) : null}
                  {pub.guideHref ? (
                    <p className="mt-1 text-sm text-gray-500">{pub.guideHref}</p>
                  ) : null}
                  {canWrite ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => void unpublish(pub.id)}
                    >
                      {t("unpublish")}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {canWrite ? (
            <form onSubmit={(e) => void publish(e)} className="mt-3 space-y-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">
                  {t("pubHeadline")}
                </span>
                <Input
                  required
                  value={publishHeadline}
                  onChange={(e) => setPublishHeadline(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">
                  {t("pubBullets")}
                </span>
                <Textarea
                  rows={4}
                  value={publishBullets}
                  placeholder={t("pubBulletsPlaceholder")}
                  onChange={(e) => setPublishBullets(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">
                  {t("pubGuideHref")}
                </span>
                <Input
                  value={publishHref}
                  placeholder={t("pubGuidePlaceholder")}
                  onChange={(e) => setPublishHref(e.target.value)}
                />
              </label>
              <Button type="submit" disabled={!publishHeadline.trim()}>
                {t("publish")}
              </Button>
            </form>
          ) : null}
        </div>
      </section>
    </>
  );
}