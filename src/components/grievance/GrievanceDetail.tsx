"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import type {
  EmailDraft,
  EmailTemplateId,
  Grievance,
  GrievanceEvent,
  GrievanceNote,
  GrievanceStatus,
} from "@/types/grievance";
import type { GrievanceConfig } from "@/types/tenant";
import { EMAIL_TEMPLATE_IDS } from "@/lib/grievance/email-templates";
import {
  buildGrievanceBundle,
  bundleToPdfLines,
} from "@/lib/grievance/export";

interface GrievanceDetailData {
  grievance: Grievance;
  events: GrievanceEvent[];
  notes: GrievanceNote[];
  dueAt: string | null;
  isOverdue: boolean;
  grievanceConfig: GrievanceConfig | null;
  localNumber?: string;
}

export function GrievanceDetail({ id }: { id: string }) {
  const t = useTranslations("grievance");
  const locale = useLocale() as "en" | "fr";
  const [data, setData] = useState<GrievanceDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplateId>("step1_meeting");
  const [copied, setCopied] = useState(false);

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
    return () => {
      cancelled = true;
    };
  }, [applyDetailData, id]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteBody.trim()) return;
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

  if (loading) return <p className="text-gray-600">{t("loading")}</p>;
  if (!data) return <p className="text-red-600">{t("notFound")}</p>;

  const { grievance, events, notes, dueAt, isOverdue, grievanceConfig } = data;

  return (
    <div>
      <Link
        href="/app/grievances"
        className="text-sm text-opseu-blue underline"
      >
        ← {t("backToList")}
      </Link>

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
          {grievance.status !== "resolved" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatus("resolved")}
            >
              {t("markResolved")}
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
              {isOverdue ? t("overdue") : t("due", { date: new Date(dueAt).toLocaleDateString() })}
            </p>
          )}
          {grievanceConfig && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-500">{t("stepChecklist")}</p>
              {grievanceConfig.steps.map((step) => (
                <button
                  key={step.number}
                  type="button"
                  disabled={step.number === grievance.currentStep}
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
                <li key={evt.id} className="border-l-2 border-opseu-blue/30 pl-3">
                  <p className="text-sm font-medium">{t(`eventType.${evt.type}`)}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(evt.createdAt).toLocaleString()}
                    {evt.stepNumber ? ` · ${t("step", { step: evt.stepNumber })}` : ""}
                  </p>
                  {evt.note && <p className="mt-1 text-sm text-gray-600">{evt.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle>{t("officerNotes")}</CardTitle>
        <p className="mt-1 text-xs text-gray-500">{t("notesImmutable")}</p>
        {notes.length > 0 && (
          <ul className="mt-3 space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm">{note.body}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {note.authorName} · {new Date(note.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
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
      </Card>

      <Card className="mt-4">
        <CardTitle>{t("emailDrafts")}</CardTitle>
        <p className="mt-1 text-sm text-gray-500">{t("emailDraftWarning")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value as EmailTemplateId)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {EMAIL_TEMPLATE_IDS.map((tid) => (
              <option key={tid} value={tid}>
                {t(`emailTemplates.${tid}`)}
              </option>
            ))}
          </select>
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
