"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  buildMailto,
  buildMembershipMeetingReminder,
} from "@/lib/comms/membership-meeting-reminder";
import { qrDataUrl } from "@/lib/export/qr";
import { copyToClipboard } from "@/lib/utils";
import { resolveLocalNumber } from "@/lib/utils/local";
import type {
  MeetingRsvpTallies,
  RsvpAttending,
  RsvpJoinMode,
  RsvpResponse,
  RsvpToken,
  UnionMeeting,
} from "@/types/meetings";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}

function isTokenActive(token: RsvpToken): boolean {
  if (token.revokedAt) return false;
  if (token.expiresAt && new Date(token.expiresAt).getTime() <= Date.now()) {
    return false;
  }
  return true;
}

export function MeetingEventsBoard({
  canWrite,
  showMemoryBanner = false,
}: {
  canWrite: boolean;
  showMemoryBanner?: boolean;
}) {
  const t = useTranslations("meetingsRsvp");
  const tc = useTranslations("common");
  const locale = useLocale() as "en" | "fr";
  const [meetings, setMeetings] = useState<UnionMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tokens, setTokens] = useState<RsvpToken[]>([]);
  const [responses, setResponses] = useState<RsvpResponse[]>([]);
  const [tallies, setTallies] = useState<MeetingRsvpTallies | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reminderCopied, setReminderCopied] = useState<
    "subject" | "body" | null
  >(null);

  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [publicBlurb, setPublicBlurb] = useState("");
  const [quorumNeeded, setQuorumNeeded] = useState("");

  const [walkName, setWalkName] = useState("");
  const [walkAttending, setWalkAttending] = useState<RsvpAttending>("yes");
  const [walkJoin, setWalkJoin] = useState<RsvpJoinMode>("on_site");
  const [walkGuests, setWalkGuests] = useState("0");

  async function refreshList() {
    const res = await fetch("/api/meetings/events");
    if (!res.ok) {
      setError(t("loadError"));
      return;
    }
    const data = (await res.json()) as { meetings: UnionMeeting[] };
    setMeetings(data.meetings);
    setError(null);
  }

  async function loadDetail(id: string) {
    setSelectedId(id);
    setQrUrl(null);
    setCopied(false);
    const res = await fetch(`/api/meetings/events/${id}`);
    if (!res.ok) {
      setError(t("detailError"));
      return;
    }
    const data = (await res.json()) as {
      meeting: UnionMeeting;
      tokens: RsvpToken[];
      responses: RsvpResponse[];
      tallies: MeetingRsvpTallies;
    };
    setTokens(data.tokens);
    setResponses(data.responses);
    setTallies(data.tallies);
    const active = data.tokens.find(isTokenActive);
    if (active && typeof window !== "undefined") {
      const link = `${window.location.origin}/${locale}/r/${active.token}`;
      const dataUrl = await qrDataUrl(link, { width: 180 });
      setQrUrl(dataUrl);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/meetings/events");
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { meetings: UnionMeeting[] };
        if (!cancelled) setMeetings(data.meetings);
      } catch {
        if (!cancelled) setError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!title.trim() || !startsAt || !endsAt || !location.trim()) {
      setError(t("createError"));
      return;
    }
    const res = await fetch("/api/meetings/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        startsAt: fromLocalInputValue(startsAt),
        endsAt: fromLocalInputValue(endsAt),
        location: location.trim(),
        publicBlurb: publicBlurb.trim() || undefined,
        quorumNeeded: quorumNeeded.trim()
          ? Number.parseInt(quorumNeeded, 10)
          : undefined,
        hybrid: true,
      }),
    });
    if (!res.ok) {
      setError(t("createError"));
      return;
    }
    const data = (await res.json()) as { meeting: UnionMeeting };
    setMessage(t("created"));
    setShowForm(false);
    setTitle("");
    setStartsAt("");
    setEndsAt("");
    setLocation("");
    setPublicBlurb("");
    setQuorumNeeded("");
    await refreshList();
    await loadDetail(data.meeting.id);
  }

  async function createToken(meetingId: string) {
    setError(null);
    const res = await fetch(`/api/meetings/events/${meetingId}/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      setError(t("tokenError"));
      return;
    }
    setMessage(t("tokenCreated"));
    await loadDetail(meetingId);
  }

  async function revokeToken(meetingId: string, tokenId: string) {
    setError(null);
    const res = await fetch(
      `/api/meetings/events/${meetingId}/tokens/${tokenId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      setError(t("tokenError"));
      return;
    }
    setMessage(t("tokenRevoked"));
    await loadDetail(meetingId);
  }

  async function copyLink(token: string) {
    if (typeof window === "undefined") return;
    const link = `${window.location.origin}/${locale}/r/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setMessage(t("linkCopied"));
    } catch {
      setError(t("copyError"));
    }
  }

  async function handleExport(meetingId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/meetings/events/${meetingId}/export`);
      if (!res.ok) throw new Error("fail");
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition");
      const match = disp?.match(/filename="([^"]+)"/);
      downloadBlob(blob, match?.[1] ?? "rsvp-export.csv");
      setMessage(t("exported"));
    } catch {
      setError(t("exportError"));
    }
  }

  async function handleWalkIn(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !walkName.trim()) return;
    setError(null);
    const body: Record<string, unknown> = {
      displayName: walkName.trim(),
      attending: walkAttending,
    };
    if (walkAttending !== "no") {
      body.joinMode = walkJoin;
      if (walkJoin === "on_site") {
        body.guestsOnSite = Number.parseInt(walkGuests, 10) || 0;
      }
    }
    const res = await fetch(`/api/meetings/events/${selectedId}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError(t("walkInError"));
      return;
    }
    setMessage(t("walkInSaved"));
    setWalkName("");
    setWalkGuests("0");
    await loadDetail(selectedId);
  }

  const activeToken = tokens.find(isTokenActive);
  const selectedMeeting = meetings.find((m) => m.id === selectedId) ?? null;

  const rsvpUrl =
    activeToken && typeof window !== "undefined"
      ? `${window.location.origin}/${locale}/r/${activeToken.token}`
      : undefined;

  const reminderEmail = useMemo(() => {
    if (!selectedMeeting) return null;
    return buildMembershipMeetingReminder(
      {
        title: selectedMeeting.title,
        startsAt: selectedMeeting.startsAt,
        endsAt: selectedMeeting.endsAt,
        location: selectedMeeting.location,
        publicBlurb: selectedMeeting.publicBlurb,
        quorumNeeded: selectedMeeting.quorumNeeded,
        quorumCount: tallies?.quorumCount,
        foodHeads: tallies?.foodHeads,
        rsvpUrl,
        localNumber: resolveLocalNumber(),
      },
      { locale },
    );
  }, [selectedMeeting, tallies, rsvpUrl, locale]);

  async function copyReminderPart(part: "subject" | "body") {
    if (!reminderEmail) return;
    const ok = await copyToClipboard(
      part === "subject" ? reminderEmail.subject : reminderEmail.body,
    );
    if (ok) {
      setReminderCopied(part);
      window.setTimeout(() => setReminderCopied(null), 1500);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-600">{t("loading")}</p>;
  }

  return (
    <section className="mt-8 max-w-2xl space-y-4 border-t border-gray-200 pt-8">
      <div>
        <h2 className="text-xl font-semibold text-opseu-dark">{t("title")}</h2>
        <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>
        {showMemoryBanner && (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            {t("memoryBanner")}
          </p>
        )}
      </div>

      {canWrite && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? t("cancel") : t("newEvent")}
          </Button>
        </div>
      )}

      {message && (
        <p className="text-sm text-green-800" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {showForm && canWrite && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="space-y-3 rounded-md border border-gray-200 p-4"
        >
          <Input
            label={t("fields.title")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            label={t("fields.startsAt")}
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
          <Input
            label={t("fields.endsAt")}
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
          />
          <Input
            label={t("fields.location")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
          <Textarea
            label={t("fields.publicBlurb")}
            value={publicBlurb}
            onChange={(e) => setPublicBlurb(e.target.value)}
          />
          <Input
            label={t("fields.quorumNeeded")}
            type="number"
            min={1}
            value={quorumNeeded}
            onChange={(e) => setQuorumNeeded(e.target.value)}
          />
          <Button type="submit" size="sm">
            {t("create")}
          </Button>
        </form>
      )}

      {meetings.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <ul className="space-y-2">
          {meetings.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                  selectedId === m.id
                    ? "border-opseu-blue bg-opseu-blue/5"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => void loadDetail(m.id)}
              >
                <span className="font-medium text-opseu-dark">{m.title}</span>
                <span className="mt-0.5 block text-xs text-gray-600">
                  {new Date(m.startsAt).toLocaleString()} · {m.location}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedId && tallies && (
        <div className="space-y-4 rounded-md border border-gray-200 p-4">
          <h3 className="font-medium text-opseu-dark">{t("talliesTitle")}</h3>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-gray-500">{t("tallies.quorum")}</dt>
              <dd className="font-semibold">
                {tallies.quorumCount}
                {tallies.quorumNeeded != null
                  ? ` / ${tallies.quorumNeeded}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">{t("tallies.shortfall")}</dt>
              <dd className="font-semibold">{tallies.quorumShortfall}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{t("tallies.foodHeads")}</dt>
              <dd className="font-semibold">{tallies.foodHeads}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{t("tallies.responses")}</dt>
              <dd className="font-semibold">{tallies.responseCount}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{t("tallies.onSiteYes")}</dt>
              <dd className="font-semibold">{tallies.onSiteYes}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{t("tallies.remoteYes")}</dt>
              <dd className="font-semibold">{tallies.remoteYes}</dd>
            </div>
          </dl>

          {canWrite && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void createToken(selectedId)}
              >
                {t("createToken")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void handleExport(selectedId)}
              >
                {t("exportCsv")}
              </Button>
            </div>
          )}

          {activeToken && (
            <div className="space-y-2 rounded-md bg-gray-50 p-3">
              <p className="text-sm font-medium">{t("shareTitle")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void copyLink(activeToken.token)}
                >
                  {copied ? t("linkCopied") : t("copyLink")}
                </Button>
                {canWrite && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void revokeToken(selectedId, activeToken.id)
                    }
                  >
                    {t("revokeToken")}
                  </Button>
                )}
              </div>
              {qrUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- QR data URL
                <img
                  src={qrUrl}
                  alt={t("qrAlt")}
                  width={180}
                  height={180}
                  className="rounded border border-gray-200 bg-white p-1"
                />
              )}
            </div>
          )}

          {reminderEmail && (
            <div className="space-y-2 border-t border-gray-200 pt-3">
              <h4 className="text-sm font-medium">{t("reminderDraft.title")}</h4>
              <p className="text-xs text-gray-600">{t("reminderDraft.hint")}</p>
              <Input
                label={t("reminderDraft.subjectLabel")}
                readOnly
                value={reminderEmail.subject}
                onFocus={(e) => e.currentTarget.select()}
              />
              <Textarea
                label={t("reminderDraft.bodyLabel")}
                readOnly
                rows={8}
                value={reminderEmail.body}
                onFocus={(e) => e.currentTarget.select()}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyReminderPart("subject")}
                >
                  {reminderCopied === "subject"
                    ? tc("copied")
                    : t("reminderDraft.copySubject")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyReminderPart("body")}
                >
                  {reminderCopied === "body"
                    ? tc("copied")
                    : t("reminderDraft.copyBody")}
                </Button>
                <a
                  href={buildMailto(reminderEmail)}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border-2 border-opseu-blue px-3 py-1.5 text-sm font-semibold text-opseu-blue hover:bg-opseu-blue/5"
                >
                  {t("reminderDraft.openMail")}
                </a>
              </div>
              <p className="text-xs text-gray-500">{t("reminderDraft.privacy")}</p>
            </div>
          )}

          {canWrite && (
            <form
              onSubmit={(e) => void handleWalkIn(e)}
              className="space-y-2 border-t border-gray-200 pt-3"
            >
              <h4 className="text-sm font-medium">{t("walkInTitle")}</h4>
              <Input
                label={t("fields.displayName")}
                value={walkName}
                onChange={(e) => setWalkName(e.target.value)}
                required
              />
              <fieldset className="space-y-1">
                <legend className="text-sm text-gray-700">
                  {t("fields.attending")}
                </legend>
                {(["yes", "maybe", "no"] as const).map((v) => (
                  <label key={v} className="mr-3 inline-flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name="walk-attending"
                      checked={walkAttending === v}
                      onChange={() => setWalkAttending(v)}
                    />
                    {t(`attending.${v}`)}
                  </label>
                ))}
              </fieldset>
              {walkAttending !== "no" && (
                <>
                  <fieldset className="space-y-1">
                    <legend className="text-sm text-gray-700">
                      {t("fields.joinMode")}
                    </legend>
                    {(["on_site", "remote"] as const).map((v) => (
                      <label
                        key={v}
                        className="mr-3 inline-flex items-center gap-1 text-sm"
                      >
                        <input
                          type="radio"
                          name="walk-join"
                          checked={walkJoin === v}
                          onChange={() => setWalkJoin(v)}
                        />
                        {t(`joinMode.${v}`)}
                      </label>
                    ))}
                  </fieldset>
                  {walkJoin === "on_site" && (
                    <Input
                      label={t("fields.guests")}
                      type="number"
                      min={0}
                      value={walkGuests}
                      onChange={(e) => setWalkGuests(e.target.value)}
                    />
                  )}
                </>
              )}
              <Button type="submit" size="sm">
                {t("walkInSubmit")}
              </Button>
            </form>
          )}

          {responses.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-1 pr-2 font-medium">{t("fields.displayName")}</th>
                    <th className="py-1 pr-2 font-medium">{t("fields.attending")}</th>
                    <th className="py-1 pr-2 font-medium">{t("fields.joinMode")}</th>
                    <th className="py-1 font-medium">{t("fields.source")}</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="py-1 pr-2">{r.displayName}</td>
                      <td className="py-1 pr-2">{t(`attending.${r.attending}`)}</td>
                      <td className="py-1 pr-2">
                        {r.joinMode ? t(`joinMode.${r.joinMode}`) : "—"}
                      </td>
                      <td className="py-1">{t(`source.${r.source}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
