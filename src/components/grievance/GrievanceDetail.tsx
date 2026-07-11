"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useStewardReadOnly } from "@/hooks/use-steward-read-only";
import { buildIcsEvent, downloadIcs } from "@/lib/calendar/ics";
import { EMAIL_TEMPLATE_IDS } from "@/lib/grievance/email-templates";
import {
  buildGrievanceBundle,
  bundleToPdfLines,
} from "@/lib/grievance/export";
import type {
  EmailDraft,
  EmailTemplateId,
  Grievance,
  GrievanceEvent,
  GrievanceNote,
  GrievanceStatus,
} from "@/types/grievance";
import type { GrievanceConfig } from "@/types/tenant";
import type {
  CaSnippet,
  CommunicationChannel,
  CommunicationDirection,
  MemberCommunication,
  ScheduledMeeting,
} from "@/types/qol";

interface GrievanceDetailData {
  grievance: Grievance;
  events: GrievanceEvent[];
  notes: GrievanceNote[];
  communications?: MemberCommunication[];
  meetings?: ScheduledMeeting[];
  dueAt: string | null;
  isOverdue: boolean;
  grievanceConfig: GrievanceConfig | null;
  localNumber?: string;
}

const CHANNELS: CommunicationChannel[] = [
  "email",
  "phone",
  "in_person",
  "letter",
  "other",
];

export function GrievanceDetail({ id }: { id: string }) {
  const t = useTranslations("grievance");
  const tq = useTranslations("qol");
  const locale = useLocale() as "en" | "fr";
  const { readOnly } = useStewardReadOnly();

  const [data, setData] = useState<GrievanceDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplateId>("step1_meeting");
  const [copied, setCopied] = useState(false);

  const [commChannel, setCommChannel] =
    useState<CommunicationChannel>("email");
  const [commDirection, setCommDirection] =
    useState<CommunicationDirection>("outbound");
  const [commSummary, setCommSummary] = useState("");
  const [commDate, setCommDate] = useState(
    () => new Date().toISOString().slice(0, 16),
  );

  const [meetTitle, setMeetTitle] = useState("");
  const [meetStart, setMeetStart] = useState("");
  const [meetEnd, setMeetEnd] = useState("");
  const [meetLocation, setMeetLocation] = useState("");

  const [snippets, setSnippets] = useState<CaSnippet[]>([]);

  const applyDetailData = useCallback((json: GrievanceDetailData) => {
    setData(json);
    setLoading(false);
  }, []);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/grievances/${id}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    applyDetailData(await res.json());
  }, [applyDetailData, id]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/grievances/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: GrievanceDetailData | null) => {
        if (cancelled) return;
        if (!json) {
          setLoading(false);
          return;
        }
        applyDetailData(json);
      });
    void fetch("/api/snippets")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.snippets) setSnippets(json.snippets);
      });
    return () => {
      cancelled = true;
    };
  }, [applyDetailData, id]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteBody.trim() || readOnly) return;
    setSavingNote(true);
    const res = await fetch(`/api/grievances/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteBody }),
    });
    if (res.ok) {
      setNoteBody("");
      await reload();
    }
    setSavingNote(false);
  }

  async function loadEmailDraft() {
    const res = await fetch(
      `/api/grievances/${id}/email-draft?template=${selectedTemplate}&locale=${locale}`,
    );
    if (res.ok) {
      const { draft } = await res.json();
      setEmailDraft(draft);
    }
  }

  async function copyDraft() {
    if (!emailDraft) return;
    await navigator.clipboard.writeText(
      `Subject: ${emailDraft.subject}\n\n${emailDraft.body}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function updateStatus(status: GrievanceStatus) {
    if (readOnly) return;
    await fetch(`/api/grievances/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        resolvedAt: status === "resolved" ? new Date().toISOString() : null,
      }),
    });
    await reload();
  }

  async function escalateStep(step: number) {
    if (readOnly) return;
    await fetch(`/api/grievances/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStep: step, status: "escalated" }),
    });
    await reload();
  }

  async function exportBundle() {
    if (!data?.grievanceConfig) return;
    const bundle = buildGrievanceBundle(
      { grievance: data.grievance, events: data.events, notes: data.notes },
      data.grievanceConfig,
    );

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("grievance.json", JSON.stringify(bundle, null, 2));

    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    const lines = bundleToPdfLines(bundle, data.localNumber);
    let y = 20;
    for (const line of lines) {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, 14, y);
      y += 7;
    }
    const pdfBlob = pdf.output("blob");
    zip.file("grievance-summary.pdf", pdfBlob);

    const blob = await zip.generateAsync({ type: "blob" });
    const { saveAs } = await import("file-saver");
    saveAs(blob, `grievance-${data.grievance.id}.zip`);
  }

  async function logCommunication(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly || !commSummary.trim()) return;
    const res = await fetch(`/api/grievances/${id}/communications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: commChannel,
        direction: commDirection,
        summary: commSummary,
        occurredAt: new Date(commDate).toISOString(),
      }),
    });
    if (res.ok) {
      setCommSummary("");
      await reload();
    }
  }

  async function scheduleMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly || !meetTitle || !meetStart || !meetEnd) return;
    const res = await fetch(`/api/grievances/${id}/meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: meetTitle,
        startsAt: new Date(meetStart).toISOString(),
        endsAt: new Date(meetEnd).toISOString(),
        location: meetLocation || undefined,
      }),
    });
    if (res.ok) {
      const { ics, meeting } = await res.json();
      downloadIcs(`meeting-${meeting.id}.ics`, ics);
      setMeetTitle("");
      setMeetStart("");
      setMeetEnd("");
      setMeetLocation("");
      await reload();
    }
  }

  function downloadDeadlineIcs() {
    if (!data?.dueAt) return;
    const start = new Date(data.dueAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const ics = buildIcsEvent({
      uid: `deadline-${data.grievance.id}@local-union-hub`,
      title: `Grievance deadline - ${data.grievance.category}`,
      description: `Step ${data.grievance.currentStep} response deadline`,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    });
    downloadIcs(`deadline-${data.grievance.id}.ics`, ics);
  }

  function insertSnippet(snippet: CaSnippet) {
    if (readOnly) return;
    setNoteBody(
      (prev) =>
        `${prev}${prev ? "\n\n" : ""}${snippet.clauseRef} - ${snippet.title}\n${snippet.body}`,
    );
  }

  if (loading) return <p className="text-gray-600">{t("loading")}</p>;
  if (!data) return <p className="text-red-600">{t("notFound")}</p>;

  const {
    grievance,
    events,
    notes,
    communications = [],
    meetings = [],
    dueAt,
    isOverdue,
    grievanceConfig,
  } = data;

  return (
    <div className={readOnly ? "max-w-3xl" : undefined}>
      <Link
        href="/app/grievances"
        className="text-sm text-opseu-blue underline"
      >
        ← {t("backToList")}
      </Link>

      {readOnly && (
        <p
          className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          {tq("mobile.readOnlyBanner")}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-opseu-dark">
            {grievance.memberPseudonym ?? t("anonymousMember")}
          </h1>
          <p className="mt-1 text-gray-600">
            {grievance.category} · {t(`status.${grievance.status}`)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!readOnly && grievance.status !== "resolved" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatus("resolved")}
            >
              {t("markResolved")}
            </Button>
          )}
          {dueAt && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadDeadlineIcs}
            >
              {tq("meetings.deadlineIcs")}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => exportBundle()}>
            {t("exportBundle")}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>{t("currentStep")}</CardTitle>
          <p className="mt-2 text-3xl font-bold text-opseu-blue">
            {t("step", { step: grievance.currentStep })}
          </p>
          {dueAt && (
            <p
              className={`mt-2 text-sm ${isOverdue ? "font-semibold text-red-600" : "text-gray-600"}`}
            >
              {isOverdue
                ? t("overdue")
                : t("due", { date: new Date(dueAt).toLocaleDateString() })}
            </p>
          )}
          {grievanceConfig && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-500">
                {t("stepChecklist")}
              </p>
              {grievanceConfig.steps.map((step) => (
                <button
                  key={step.number}
                  type="button"
                  disabled={readOnly || step.number === grievance.currentStep}
                  onClick={() => escalateStep(step.number)}
                  className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    step.number === grievance.currentStep
                      ? "border-opseu-blue bg-opseu-blue/5 font-semibold"
                      : step.number < grievance.currentStep
                        ? "border-gray-200 text-gray-400 line-through"
                        : "border-gray-200 hover:border-opseu-blue/40"
                  }`}
                >
                  {step.name}
                  {step.responseDays != null && (
                    <span className="ml-2 text-gray-500">
                      ({step.responseDays}d)
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>{t("timeline")}</CardTitle>
          {events.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">{t("noEvents")}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {events.map((evt) => (
                <li
                  key={evt.id}
                  className="border-l-2 border-opseu-blue/30 pl-3"
                >
                  <p className="text-sm font-medium">
                    {t(`eventType.${evt.type}`)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(evt.createdAt).toLocaleString()}
                    {evt.stepNumber
                      ? ` · ${t("step", { step: evt.stepNumber })}`
                      : ""}
                  </p>
                  {evt.note && (
                    <p className="mt-1 text-sm text-gray-600">{evt.note}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle>{tq("comms.title")}</CardTitle>
        <p className="mt-1 text-xs text-gray-500">{tq("comms.hint")}</p>
        {communications.length > 0 && (
          <ul className="mt-3 space-y-3">
            {communications.map((c) => (
              <li key={c.id} className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm font-medium">
                  {tq(`comms.channel.${c.channel}`)} ·{" "}
                  {tq(`comms.direction.${c.direction}`)}
                </p>
                <p className="mt-1 text-sm">{c.summary}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {c.loggedByName} ·{" "}
                  {new Date(c.occurredAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
        {!readOnly && (
          <form onSubmit={logCommunication} className="mt-4 space-y-2">
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="text-sm font-medium text-gray-700">
                {tq("comms.channelLabel")}
                <select
                  value={commChannel}
                  onChange={(e) =>
                    setCommChannel(e.target.value as CommunicationChannel)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>
                      {tq(`comms.channel.${ch}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">
                {tq("comms.directionLabel")}
                <select
                  value={commDirection}
                  onChange={(e) =>
                    setCommDirection(e.target.value as CommunicationDirection)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="outbound">
                    {tq("comms.direction.outbound")}
                  </option>
                  <option value="inbound">
                    {tq("comms.direction.inbound")}
                  </option>
                </select>
              </label>
              <Input
                type="datetime-local"
                label={tq("comms.when")}
                value={commDate}
                onChange={(e) => setCommDate(e.target.value)}
                required
              />
            </div>
            <Textarea
              label={tq("comms.summary")}
              value={commSummary}
              onChange={(e) => setCommSummary(e.target.value)}
              rows={2}
              required
            />
            <Button type="submit" size="sm">
              {tq("comms.log")}
            </Button>
          </form>
        )}
      </Card>

      <Card className="mt-4">
        <CardTitle>{tq("meetings.title")}</CardTitle>
        <p className="mt-1 text-xs text-gray-500">{tq("meetings.hint")}</p>
        {meetings.length > 0 && (
          <ul className="mt-3 space-y-2">
            {meetings.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-gray-50 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-gray-600">
                    {new Date(m.startsAt).toLocaleString()} –{" "}
                    {new Date(m.endsAt).toLocaleString()}
                    {m.location ? ` · ${m.location}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const ics = buildIcsEvent({
                      uid: `${m.id}@local-union-hub`,
                      title: m.title,
                      description: m.description,
                      location: m.location,
                      startsAt: m.startsAt,
                      endsAt: m.endsAt,
                    });
                    downloadIcs(`meeting-${m.id}.ics`, ics);
                  }}
                >
                  {tq("meetings.downloadIcs")}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {!readOnly && (
          <form onSubmit={scheduleMeeting} className="mt-4 space-y-2">
            <Input
              label={tq("meetings.fieldTitle")}
              value={meetTitle}
              onChange={(e) => setMeetTitle(e.target.value)}
              required
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                type="datetime-local"
                label={tq("meetings.starts")}
                value={meetStart}
                onChange={(e) => setMeetStart(e.target.value)}
                required
              />
              <Input
                type="datetime-local"
                label={tq("meetings.ends")}
                value={meetEnd}
                onChange={(e) => setMeetEnd(e.target.value)}
                required
              />
            </div>
            <Input
              label={tq("meetings.location")}
              value={meetLocation}
              onChange={(e) => setMeetLocation(e.target.value)}
            />
            <Button type="submit" size="sm">
              {tq("meetings.schedule")}
            </Button>
          </form>
        )}
      </Card>

      <Card className="mt-4">
        <CardTitle>{t("officerNotes")}</CardTitle>
        <p className="mt-1 text-xs text-gray-500">{t("notesImmutable")}</p>
        {notes.length > 0 && (
          <ul className="mt-3 space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm">{note.body}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {note.authorName} ·{" "}
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
        {!readOnly && (
          <>
            {snippets.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700">
                  {tq("snippets.insert")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {snippets.slice(0, 6).map((s) => (
                    <Button
                      key={s.id}
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => insertSnippet(s)}
                    >
                      {s.clauseRef}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <form onSubmit={addNote} className="mt-4 space-y-2">
              <Textarea
                label={t("addNote")}
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={3}
                required
              />
              <Button type="submit" size="sm" disabled={savingNote}>
                {savingNote ? t("saving") : t("saveNote")}
              </Button>
            </form>
          </>
        )}
      </Card>

      <Card className="mt-4">
        <CardTitle>{t("emailDrafts")}</CardTitle>
        <p className="mt-1 text-sm text-gray-500">{t("emailDraftWarning")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="text-sm font-medium text-gray-700">
            <span className="sr-only">{t("emailDrafts")}</span>
            <select
              value={selectedTemplate}
              onChange={(e) =>
                setSelectedTemplate(e.target.value as EmailTemplateId)
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              aria-label={t("emailDrafts")}
            >
              {EMAIL_TEMPLATE_IDS.map((tid) => (
                <option key={tid} value={tid}>
                  {t(`emailTemplates.${tid}`)}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" variant="outline" onClick={() => loadEmailDraft()}>
            {t("generateDraft")}
          </Button>
          {emailDraft && (
            <Button size="sm" variant="secondary" onClick={() => copyDraft()}>
              {copied ? t("copied") : t("copyDraft")}
            </Button>
          )}
        </div>
        {emailDraft && (
          <div className="mt-4 rounded-lg bg-gray-50 p-4">
            <p className="text-sm font-semibold">{emailDraft.subject}</p>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
              {emailDraft.body}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}
