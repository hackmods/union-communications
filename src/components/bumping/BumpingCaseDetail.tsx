"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useHybridCaseStore } from "@/hooks/use-hybrid-case-store";
import { DEFAULT_BUMPING_CHECKLIST } from "@/lib/bumping/checklist";
import {
  diffLines,
  positionToCompareText,
} from "@/lib/bumping/diff";
import {
  buildBumpingExportBundle,
  bundleToPdfLines,
} from "@/lib/bumping/export";
import type {
  BumpingCaseWithRelations,
  ChecklistState,
  DiffLine,
} from "@/types/bumping";
import type { AttachmentMeta } from "@/types/attachments";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function BumpingCaseDetail({
  id,
  canWrite,
}: {
  id: string;
  canWrite: boolean;
}) {
  const t = useTranslations("bumping");
  const th = useTranslations("hybrid");
  const {
    getBumpingCase,
    updateBumpingCase,
    addBumpingNote,
    addBumpingSession,
    setBumpingDecision,
    needsUnlock,
    isLiveLocal,
    revision,
  } = useHybridCaseStore();
  const [data, setData] = useState<BumpingCaseWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteBody, setNoteBody] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionAgenda, setSessionAgenda] = useState("");
  const [sessionAttendees, setSessionAttendees] = useState("");
  const [decisionOutcome, setDecisionOutcome] = useState("");
  const [decisionRationale, setDecisionRationale] = useState("");
  const [decisionDissent, setDecisionDissent] = useState("");

  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const applyCaseData = useCallback((json: BumpingCaseWithRelations) => {
    setData(json);
    if (json.decision) {
      setDecisionOutcome(json.decision.outcome);
      setDecisionRationale(json.decision.rationale);
      setDecisionDissent(json.decision.dissentNotes ?? "");
    }
    setLoading(false);
  }, []);

  const reload = useCallback(async () => {
    const result = await getBumpingCase(id);
    if (result.source === "locked" || !result.data) {
      setLoading(false);
      return;
    }
    applyCaseData(result.data);
  }, [applyCaseData, getBumpingCase, id]);

  useEffect(() => {
    let cancelled = false;
    void getBumpingCase(id).then((result) => {
      if (cancelled) return;
      if (result.source === "locked" || !result.data) {
        setLoading(false);
        return;
      }
      applyCaseData(result.data);
    });
    void fetch(`/api/bumping/cases/${id}/attachments`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.attachments) setAttachments(json.attachments);
      });
    return () => {
      cancelled = true;
    };
  }, [applyCaseData, getBumpingCase, id, revision]);

  async function reloadAttachments() {
    const res = await fetch(`/api/bumping/cases/${id}/attachments`);
    if (res.ok) {
      const json = await res.json();
      setAttachments(json.attachments ?? []);
    }
  }

  async function uploadAttachment(e: React.FormEvent) {
    e.preventDefault();
    setAttachmentError(null);
    if (!canWrite || !uploadFile) return;
    if (uploadFile.size > MAX_ATTACHMENT_BYTES) {
      setAttachmentError(t("attachments.fileTooLarge"));
      return;
    }
    setUploading(true);
    try {
      const contentBase64 = await fileToBase64(uploadFile);
      const res = await fetch(`/api/bumping/cases/${id}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: uploadFile.name,
          mimeType: uploadFile.type || "application/octet-stream",
          sizeBytes: uploadFile.size,
          contentBase64,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setAttachmentError(json?.error ?? t("attachments.uploadError"));
      } else {
        setUploadFile(null);
        await reloadAttachments();
      }
    } catch {
      setAttachmentError(t("attachments.uploadError"));
    } finally {
      setUploading(false);
    }
  }

  async function updateChecklist(itemId: string, value: boolean) {
    if (!data || !canWrite) return;
    const checklist: ChecklistState = {
      ...data.bumpingCase.checklist,
      [itemId]: value,
    };
    await updateBumpingCase(id, {
      checklist,
      status: "in_review",
    });
    await reload();
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteBody.trim()) return;
    await addBumpingNote(id, { body: noteBody });
    setNoteBody("");
    await reload();
  }

  async function addSession(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionDate || !sessionAgenda.trim()) return;
    await addBumpingSession(id, {
      date: sessionDate,
      agenda: sessionAgenda,
      attendees: sessionAttendees
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    });
    setSessionDate("");
    setSessionAgenda("");
    setSessionAttendees("");
    await reload();
  }

  async function recordDecision(e: React.FormEvent) {
    e.preventDefault();
    await setBumpingDecision(id, {
      outcome: decisionOutcome,
      rationale: decisionRationale,
      dissentNotes: decisionDissent || undefined,
    });
    await reload();
  }

  async function exportBundle() {
    if (!data) return;
    const bundle = buildBumpingExportBundle(data);
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("bumping-case.json", JSON.stringify(bundle, null, 2));

    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    const lines = bundleToPdfLines(bundle);
    let y = 20;
    for (const line of lines) {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line.slice(0, 90), 14, y);
      y += 7;
    }
    zip.file("decision-log.pdf", pdf.output("blob"));
    const blob = await zip.generateAsync({ type: "blob" });
    const { saveAs } = await import("file-saver");
    saveAs(blob, `bumping-${data.bumpingCase.id}.zip`);
  }

  if (needsUnlock) {
    return (
      <p
        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        role="status"
      >
        {th("needsUnlockBanner")}{" "}
        <Link href="/app/hybrid" className="font-medium underline">
          {th("openHybridSettings")}
        </Link>
      </p>
    );
  }
  if (loading) return <p className="text-gray-600">{t("loading")}</p>;
  if (!data) return <p className="text-red-600">{t("notFound")}</p>;

  const { bumpingCase, sessions, notes, decision } = data;
  const leftText = positionToCompareText(bumpingCase.incumbentPosition);
  const rightText = positionToCompareText(bumpingCase.bumpingPosition);
  const diff = diffLines(leftText, rightText);

  return (
    <div>
      <Link href="/app/bumping" className="text-sm text-opseu-blue underline">
        ← {t("backToList")}
      </Link>

      {isLiveLocal && (
        <p
          className="mt-3 rounded-lg border border-opseu-blue/20 bg-opseu-blue/5 px-3 py-2 text-sm text-opseu-dark"
          role="status"
        >
          {th("liveLocalBanner")}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-opseu-dark">
            {bumpingCase.memberRef}
          </h1>
          <p className="mt-1 text-gray-600">
            {bumpingCase.currentPosition} → {bumpingCase.targetPosition}
          </p>
          <p className="mt-1 text-sm text-gray-500">{bumpingCase.scenario}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => exportBundle()}>
          {t("exportLog")}
        </Button>
      </div>

      <Card className="mt-6">
        <CardTitle>{t("positionCompare")}</CardTitle>
        <p className="mt-1 text-xs text-gray-500">{t("compareHint")}</p>
        <PositionDiffView diff={diff} t={t} />
      </Card>

      <Card className="mt-4">
        <CardTitle>{t("checklist")}</CardTitle>
        <p className="mt-1 text-xs text-gray-500">{t("disclaimer")}</p>
        <ul className="mt-3 space-y-2">
          {DEFAULT_BUMPING_CHECKLIST.map((item) => {
            const val = bumpingCase.checklist[item.id];
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2"
              >
                <span className="text-sm">{t(`checklistItems.${item.labelKey}`)}</span>
                {canWrite ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateChecklist(item.id, true)}
                      className={`rounded px-2 py-1 text-xs ${val === true ? "bg-green-100 font-semibold text-green-800" : "bg-gray-100"}`}
                    >
                      {t("yes")}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateChecklist(item.id, false)}
                      className={`rounded px-2 py-1 text-xs ${val === false ? "bg-red-100 font-semibold text-red-800" : "bg-gray-100"}`}
                    >
                      {t("no")}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">
                    {val === true ? t("yes") : val === false ? t("no") : t("pending")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>{t("sessions")}</CardTitle>
          {sessions.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">{t("noSessions")}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {sessions.map((s) => (
                <li key={s.id} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm font-medium">{s.date}</p>
                  <p className="text-sm text-gray-600">{s.agenda}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {s.attendees.join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {canWrite && (
            <form onSubmit={addSession} className="mt-4 space-y-2">
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
              <Textarea
                value={sessionAgenda}
                onChange={(e) => setSessionAgenda(e.target.value)}
                placeholder={t("sessionAgenda")}
                rows={2}
                required
              />
              <input
                type="text"
                value={sessionAttendees}
                onChange={(e) => setSessionAttendees(e.target.value)}
                placeholder={t("sessionAttendees")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <Button type="submit" size="sm">
                {t("addSession")}
              </Button>
            </form>
          )}
        </Card>

        <Card>
          <CardTitle>{t("committeeNotes")}</CardTitle>
          {notes.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">{t("noNotes")}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm">{n.body}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {n.authorName} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {canWrite && (
            <form onSubmit={addNote} className="mt-4 space-y-2">
              <Textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder={t("addNote")}
                rows={3}
                required
              />
              <Button type="submit" size="sm">
                {t("saveNote")}
              </Button>
            </form>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle>{t("attachments.title")}</CardTitle>
        <p className="mt-1 text-xs text-gray-500">{t("attachments.hint")}</p>
        {attachments.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">{t("attachments.empty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{a.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {t("attachments.uploadedBy", {
                      date: new Date(a.createdAt).toLocaleString(),
                    })}
                    {a.scanStatus === "pending" &&
                      ` · ${t("attachments.scanPending")}`}
                    {a.scanStatus === "infected" &&
                      ` · ${t("attachments.scanInfected")}`}
                  </p>
                </div>
                {(a.scanStatus === "clean" ||
                  a.scanStatus === "skipped_dev") && (
                  <a
                    href={`/api/bumping/cases/${id}/attachments/${a.id}/download`}
                    className="rounded-lg border border-opseu-blue px-3 py-1 text-xs font-medium text-opseu-blue hover:bg-opseu-blue/5"
                  >
                    {t("attachments.download")}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
        {canWrite && (
          <form onSubmit={uploadAttachment} className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t("attachments.upload")}
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-opseu-blue/10 file:px-3 file:py-2 file:text-opseu-blue"
              />
            </label>
            <p className="text-xs text-gray-500">{t("attachments.sizeLimit")}</p>
            {attachmentError && (
              <p className="text-sm text-red-600">{attachmentError}</p>
            )}
            <Button type="submit" size="sm" disabled={uploading || !uploadFile}>
              {uploading ? t("attachments.uploading") : t("attachments.upload")}
            </Button>
          </form>
        )}
      </Card>

      <Card className="mt-4">
        <CardTitle>{t("decision")}</CardTitle>
        <p className="mt-1 text-xs text-gray-500">{t("decisionHint")}</p>
        {decision && !canWrite && (
          <div className="mt-3 rounded-lg bg-gray-50 p-4">
            <p className="font-semibold">{decision.outcome}</p>
            <p className="mt-2 text-sm">{decision.rationale}</p>
            {decision.dissentNotes && (
              <p className="mt-2 text-sm text-gray-600">
                {t("dissent")}: {decision.dissentNotes}
              </p>
            )}
          </div>
        )}
        {canWrite && (
          <form onSubmit={recordDecision} className="mt-4 space-y-3">
            <Textarea
              label={t("outcome")}
              value={decisionOutcome}
              onChange={(e) => setDecisionOutcome(e.target.value)}
              rows={2}
              required
            />
            <Textarea
              label={t("rationale")}
              value={decisionRationale}
              onChange={(e) => setDecisionRationale(e.target.value)}
              rows={3}
              required
            />
            <Textarea
              label={t("dissent")}
              value={decisionDissent}
              onChange={(e) => setDecisionDissent(e.target.value)}
              rows={2}
            />
            <Button type="submit" size="sm">
              {t("recordDecision")}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

function PositionDiffView({
  diff,
  t,
}: {
  diff: DiffLine[];
  t: ReturnType<typeof useTranslations<"bumping">>;
}) {
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
          {t("incumbentPosition")}
        </p>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 p-3 font-mono text-xs">
          {diff.map((line, i) => (
            <div
              key={i}
              className={
                line.type === "removed" || line.type === "changed"
                  ? "bg-red-50 text-red-900"
                  : line.type === "same"
                    ? "text-gray-700"
                    : "text-gray-300"
              }
            >
              {line.left ?? ""}
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
          {t("bumpingPosition")}
        </p>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 p-3 font-mono text-xs">
          {diff.map((line, i) => (
            <div
              key={i}
              className={
                line.type === "added" || line.type === "changed"
                  ? "bg-green-50 text-green-900"
                  : line.type === "same"
                    ? "text-gray-700"
                    : "text-gray-300"
              }
            >
              {line.right ?? ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
