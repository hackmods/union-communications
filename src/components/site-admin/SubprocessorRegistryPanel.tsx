"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { fromExclusiveEndBoundary } from "@/lib/site-admin/subprocessor-registry";

type RegistryRecord = {
  id: string;
  serviceName: string;
  purpose: { en: string; fr: string };
  dataCategories: { en: string[]; fr: string[] };
  dataSubjects: { en: string[]; fr: string[] };
  processingRegion: string;
  transferStatus: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  reviewStatus: string;
  dpaStatus: string;
  publicDisclosureApproved: boolean;
  publicNotes: { en: string; fr: string };
  internalNotes: string;
  verificationEvidence: string;
  reviewOwner: string | null;
  reviewedBy: string | null;
  createdBy: string;
  updatedAt: string;
};

type AuditEvent = {
  id: string;
  actorId: string;
  providerId: string | null;
  action: string;
  createdAt: string;
};

type FormState = {
  serviceName: string;
  purposeEn: string;
  purposeFr: string;
  dataCategoriesEn: string;
  dataCategoriesFr: string;
  dataSubjectsEn: string;
  dataSubjectsFr: string;
  processingRegion: string;
  transferStatus: string;
  effectiveFrom: string;
  effectiveTo: string;
  publicNotesEn: string;
  publicNotesFr: string;
  internalNotes: string;
  verificationEvidence: string;
};

type ReviewFormState = {
  reviewOwner: string;
  dpaStatus: string;
  confirmedDisclosure: boolean;
};

type PendingPublication = {
  id: string;
  serviceName: string;
  published: boolean;
};

type PendingReview = {
  id: string;
  serviceName: string;
  reviewStatus: "approved" | "rejected";
  dpaStatus: string;
  reviewOwner: string;
  publicDisclosureApproved: boolean;
};

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    serviceName: "",
    purposeEn: "",
    purposeFr: "",
    dataCategoriesEn: "",
    dataCategoriesFr: "",
    dataSubjectsEn: "",
    dataSubjectsFr: "",
    processingRegion: "",
    transferStatus: "under_review",
    effectiveFrom: todayInputValue(),
    effectiveTo: "",
    publicNotesEn: "",
    publicNotesFr: "",
    internalNotes: "",
    verificationEvidence: "",
  };
}

function lines(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function dateValue(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export function SubprocessorRegistryPanel() {
  const t = useTranslations("hub.platformOperator.subprocessors");
  const [records, setRecords] = useState<RegistryRecord[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [publishedIds, setPublishedIds] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewForms, setReviewForms] = useState<Record<string, ReviewFormState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingPublication, setPendingPublication] = useState<PendingPublication | null>(null);
  const [publicationMfaCode, setPublicationMfaCode] = useState("");
  const [publicationChallengeNeeded, setPublicationChallengeNeeded] = useState(false);
  const [publicationUncertain, setPublicationUncertain] = useState(false);
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [reviewMfaCode, setReviewMfaCode] = useState("");
  const [reviewChallengeNeeded, setReviewChallengeNeeded] = useState(false);
  const [reviewUncertain, setReviewUncertain] = useState(false);

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch("/api/site-admin/subprocessors", { cache: "no-store" });
      const payload = await response.json() as {
        records?: RegistryRecord[];
        events?: AuditEvent[];
        publishedIds?: string[];
      };
      if (!response.ok) throw new Error(payload && "error" in payload ? String(payload.error) : t("loadFailed"));
      setRecords(payload.records ?? []);
      setEvents(payload.events ?? []);
      setPublishedIds(payload.publishedIds ?? []);
      return true;
    } catch {
      setMessage(t("loadFailed"));
      return false;
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  function edit(record: RegistryRecord) {
    setSelectedId(record.id);
    setForm({
      serviceName: record.serviceName,
      purposeEn: record.purpose.en,
      purposeFr: record.purpose.fr,
      dataCategoriesEn: record.dataCategories.en.join("\n"),
      dataCategoriesFr: record.dataCategories.fr.join("\n"),
      dataSubjectsEn: record.dataSubjects.en.join("\n"),
      dataSubjectsFr: record.dataSubjects.fr.join("\n"),
      processingRegion: record.processingRegion,
      transferStatus: record.transferStatus,
      effectiveFrom: dateValue(record.effectiveFrom),
      effectiveTo: fromExclusiveEndBoundary(record.effectiveTo),
      publicNotesEn: record.publicNotes.en,
      publicNotesFr: record.publicNotes.fr,
      internalNotes: record.internalNotes ?? "",
      verificationEvidence: record.verificationEvidence ?? "",
    });
    setReviewForms((current) => ({
      ...current,
      [record.id]: {
        reviewOwner: record.reviewOwner ?? "",
        dpaStatus: record.dpaStatus,
        confirmedDisclosure: false,
      },
    }));
    setMessage("");
  }

  function resetForm() {
    setSelectedId(null);
    setForm(emptyForm());
  }

  function reviewForm(record: RegistryRecord): ReviewFormState {
    return reviewForms[record.id] ?? {
      reviewOwner: "",
      dpaStatus: record.dpaStatus,
      confirmedDisclosure: false,
    };
  }

  function updateReviewForm(record: RegistryRecord, update: Partial<ReviewFormState>) {
    setReviewForms((current) => {
      const existing = current[record.id] ?? {
        reviewOwner: "",
        dpaStatus: record.dpaStatus,
        confirmedDisclosure: false,
      };
      return { ...current, [record.id]: { ...existing, ...update } };
    });
  }

  async function sendJson(url: string, method: string, body: unknown): Promise<boolean> {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(payload.error || t("saveFailed"));
        return false;
      }
      setMessage(t("saved"));
      await load();
      return true;
    } catch {
      setMessage(t("saveFailed"));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      serviceName: form.serviceName,
      processingRegion: form.processingRegion,
      transferStatus: form.transferStatus,
      purpose: { en: form.purposeEn, fr: form.purposeFr },
      dataCategories: { en: lines(form.dataCategoriesEn), fr: lines(form.dataCategoriesFr) },
      dataSubjects: { en: lines(form.dataSubjectsEn), fr: lines(form.dataSubjectsFr) },
      publicNotes: { en: form.publicNotesEn, fr: form.publicNotesFr },
      internalNotes: form.internalNotes,
      verificationEvidence: form.verificationEvidence,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || null,
    };
    const success = await sendJson(
      selectedId ? `/api/site-admin/subprocessors/${selectedId}` : "/api/site-admin/subprocessors",
      selectedId ? "PATCH" : "POST",
      payload,
    );
    if (success) resetForm();
  }

  async function review(record: RegistryRecord, approved: boolean) {
    const reviewInput = reviewForm(record);
    if (approved && !reviewInput.confirmedDisclosure) {
      setMessage(t("approvalAttestationRequired"));
      return;
    }
    const pending: PendingReview = {
      id: record.id,
      serviceName: record.serviceName,
      reviewStatus: approved ? "approved" : "rejected",
      dpaStatus: reviewInput.dpaStatus,
      reviewOwner: reviewInput.reviewOwner.trim(),
      publicDisclosureApproved: approved && reviewInput.confirmedDisclosure,
    };
    setPendingReview(pending);
    setReviewMfaCode("");
    setReviewChallengeNeeded(false);
    setReviewUncertain(false);
    await sendReview(pending);
    updateReviewForm(record, { confirmedDisclosure: false });
  }

  async function sendReview(pending: PendingReview, mfaCode?: string) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/site-admin/subprocessors/${pending.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewStatus: pending.reviewStatus,
          dpaStatus: pending.dpaStatus,
          reviewOwner: pending.reviewOwner,
          publicDisclosureApproved: pending.publicDisclosureApproved,
          ...(mfaCode ? { mfaCode } : {}),
        }),
      });
      const payload = await response.json() as { error?: string; code?: string };
      const code = payload.code ?? "";
      if (response.status === 428 || code.startsWith("mfa_step_up_")) {
        setReviewMfaCode("");
        setReviewChallengeNeeded(true);
        if (code.endsWith("_required")) {
          setMessage(t("reviewChallengeRequired"));
        } else if (code.endsWith("_unavailable")) {
          setMessage(t("reviewChallengeUnavailable"));
        } else if (code.endsWith("_limited")) {
          setMessage(t("reviewChallengeLimited"));
        } else {
          setMessage(t("reviewChallengeFailed"));
        }
        return;
      }
      if (code === "audit_unavailable") {
        setReviewMfaCode("");
        setReviewChallengeNeeded(true);
        setMessage(t("reviewChallengeUnavailable"));
        return;
      }
      if (code === "subprocessor_review_result_unconfirmed" || code === "subprocessor_review_outcome_unconfirmed") {
        setReviewMfaCode("");
        setReviewChallengeNeeded(false);
        setReviewUncertain(true);
        setMessage(t("reviewOutcomeUncertain"));
        return;
      }
      if (!response.ok) {
        setPendingReview(null);
        setReviewMfaCode("");
        setReviewChallengeNeeded(false);
        setMessage(code === "second_admin_required" ? t("secondAdminRequired") : payload.error || t("saveFailed"));
        return;
      }
      setPendingReview(null);
      setReviewMfaCode("");
      setReviewChallengeNeeded(false);
      setReviewUncertain(false);
      setMessage(t("saved"));
      const loaded = await load();
      if (!loaded) {
        setPendingReview(pending);
        setReviewUncertain(true);
        setMessage(t("reviewRefreshRequired"));
      }
    } catch {
      setReviewMfaCode("");
      setReviewChallengeNeeded(false);
      setReviewUncertain(true);
      setMessage(t("reviewOutcomeUncertain"));
    } finally {
      setSaving(false);
    }
  }

  async function confirmReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingReview || reviewUncertain) return;
    await sendReview(pendingReview, reviewMfaCode.trim());
  }

  function cancelReview() {
    if (saving) return;
    setPendingReview(null);
    setReviewMfaCode("");
    setReviewChallengeNeeded(false);
    setReviewUncertain(false);
    setMessage("");
  }

  async function reloadReviewStatus() {
    const loaded = await load();
    if (!loaded) return;
    setPendingReview(null);
    setReviewMfaCode("");
    setReviewChallengeNeeded(false);
    setReviewUncertain(false);
    setMessage("");
  }

  async function sendPublication(id: string, published: boolean, mfaCode?: string) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/site-admin/subprocessors/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published, ...(mfaCode ? { mfaCode } : {}) }),
      });
      const payload = await response.json() as { error?: string; code?: string };
      const code = payload.code ?? "";
      if (response.status === 428 || code.startsWith("mfa_step_up_")) {
        setPublicationMfaCode("");
        setPublicationChallengeNeeded(true);
        if (code.endsWith("_required")) {
          setMessage(t("publicationChallengeRequired"));
        } else if (code.endsWith("_unavailable")) {
          setMessage(t("publicationChallengeUnavailable"));
        } else if (code.endsWith("_limited")) {
          setMessage(t("publicationChallengeLimited"));
        } else {
          setMessage(t("publicationChallengeFailed"));
        }
        return;
      }
      if (code === "audit_unavailable") {
        setPublicationMfaCode("");
        setPublicationChallengeNeeded(true);
        setMessage(t("publicationChallengeUnavailable"));
        return;
      }
      if (code === "subprocessor_publish_result_unconfirmed" || code === "subprocessor_publish_outcome_unconfirmed") {
        setPublicationMfaCode("");
        setPublicationChallengeNeeded(false);
        setPublicationUncertain(true);
        setMessage(t("publicationOutcomeUncertain"));
        return;
      }
      if (!response.ok) {
        setPendingPublication(null);
        setPublicationMfaCode("");
        setPublicationChallengeNeeded(false);
        setMessage(payload.error || t("saveFailed"));
        return;
      }
      setPendingPublication(null);
      setPublicationMfaCode("");
      setPublicationChallengeNeeded(false);
      setPublicationUncertain(false);
      setMessage(t("saved"));
      const loaded = await load();
      if (!loaded) {
        setPendingPublication({
          id,
          serviceName: records.find((record) => record.id === id)?.serviceName ?? id,
          published,
        });
        setPublicationUncertain(true);
        setMessage(t("publicationRefreshRequired"));
      }
    } catch {
      setPublicationMfaCode("");
      setPublicationChallengeNeeded(false);
      setPublicationUncertain(true);
      setMessage(t("publicationOutcomeUncertain"));
    } finally {
      setSaving(false);
    }
  }

  async function togglePublication(record: RegistryRecord) {
    const pending = {
      id: record.id,
      serviceName: record.serviceName,
      published: !publishedIds.includes(record.id),
    };
    setPendingPublication(pending);
    setPublicationMfaCode("");
    setPublicationChallengeNeeded(false);
    setPublicationUncertain(false);
    await sendPublication(pending.id, pending.published);
  }

  async function confirmPublication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingPublication || publicationUncertain) return;
    await sendPublication(
      pendingPublication.id,
      pendingPublication.published,
      publicationMfaCode.trim(),
    );
  }

  function cancelPublication() {
    if (saving) return;
    setPendingPublication(null);
    setPublicationMfaCode("");
    setPublicationChallengeNeeded(false);
    setPublicationUncertain(false);
    setMessage("");
  }

  async function reloadPublicationStatus() {
    const loaded = await load();
    if (!loaded) return;
    setPendingPublication(null);
    setPublicationMfaCode("");
    setPublicationChallengeNeeded(false);
    setPublicationUncertain(false);
    setMessage("");
  }

  const hasPendingAction = Boolean(pendingPublication || pendingReview);
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const fieldClass = "mt-1 block w-full rounded-md border border-opseu-gray/30 bg-white px-3 py-2 text-sm text-opseu-dark";
  const buttonClass = "rounded-md border border-opseu-blue px-3 py-2 text-sm font-semibold text-opseu-blue hover:bg-opseu-blue/5 disabled:opacity-50";
  function statusLabel(status: string): string {
    if (status === "approved") return t("status.approved");
    if (status === "rejected") return t("status.rejected");
    if (status === "not_applicable") return t("status.not_applicable");
    if (status === "under_review") return t("status.under_review");
    return t("status.unreviewed");
  }
  function transferLabel(status: string): string {
    if (status === "within_canada") return t("transfer.within_canada");
    if (status === "cross_border") return t("transfer.cross_border");
    if (status === "not_applicable") return t("transfer.not_applicable");
    return t("transfer.under_review");
  }

  return (
    <div className="space-y-8">
      <p className="rounded-lg border border-amber-700/20 bg-amber-50 p-4 text-sm text-opseu-dark">
        {t("operatorEvidenceNote")}
      </p>

      <section className="rounded-lg border border-opseu-gray/20 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-opseu-dark">{selectedId ? t("editHeading") : t("newHeading")}</h2>
        <form className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={submit}>
          <label className="text-sm font-medium text-opseu-dark">
            {t("serviceName")}<input required maxLength={160} className={fieldClass} value={form.serviceName} onChange={(event) => setField("serviceName", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-opseu-dark">
            {t("processingRegion")}<input required maxLength={160} className={fieldClass} value={form.processingRegion} onChange={(event) => setField("processingRegion", event.target.value)} />
          </label>
          <p className="text-sm text-opseu-gray-dark md:col-span-2">{t("localizationNote")}</p>
          <label className="text-sm font-medium text-opseu-dark">
            {t("purposeEn")}<textarea required maxLength={1000} rows={2} className={fieldClass} value={form.purposeEn} onChange={(event) => setField("purposeEn", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-opseu-dark">
            {t("purposeFr")}<textarea required maxLength={1000} rows={2} className={fieldClass} value={form.purposeFr} onChange={(event) => setField("purposeFr", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-opseu-dark">
            {t("dataCategoriesEn")}<textarea required rows={3} className={fieldClass} value={form.dataCategoriesEn} onChange={(event) => setField("dataCategoriesEn", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-opseu-dark">
            {t("dataCategoriesFr")}<textarea required rows={3} className={fieldClass} value={form.dataCategoriesFr} onChange={(event) => setField("dataCategoriesFr", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-opseu-dark">
            {t("dataSubjectsEn")}<textarea required rows={3} className={fieldClass} value={form.dataSubjectsEn} onChange={(event) => setField("dataSubjectsEn", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-opseu-dark">
            {t("dataSubjectsFr")}<textarea required rows={3} className={fieldClass} value={form.dataSubjectsFr} onChange={(event) => setField("dataSubjectsFr", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-opseu-dark">
            {t("transferStatus")}<select className={fieldClass} value={form.transferStatus} onChange={(event) => setField("transferStatus", event.target.value)}>
              <option value="under_review">{t("transferUnderReview")}</option>
              <option value="within_canada">{t("transferWithinCanada")}</option>
              <option value="cross_border">{t("transferCrossBorder")}</option>
              <option value="not_applicable">{t("transferNotApplicable")}</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-opseu-dark">
              {t("effectiveFrom")}<input required type="date" className={fieldClass} value={form.effectiveFrom} onChange={(event) => setField("effectiveFrom", event.target.value)} />
            </label>
            <label className="text-sm font-medium text-opseu-dark">
              {t("effectiveTo")}<input type="date" className={fieldClass} value={form.effectiveTo} onChange={(event) => setField("effectiveTo", event.target.value)} />
            </label>
          </div>
          <label className="text-sm font-medium text-opseu-dark">
            {t("publicNotesEn")}<textarea rows={2} maxLength={2000} className={fieldClass} value={form.publicNotesEn} onChange={(event) => setField("publicNotesEn", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-opseu-dark">
            {t("publicNotesFr")}<textarea rows={2} maxLength={2000} className={fieldClass} value={form.publicNotesFr} onChange={(event) => setField("publicNotesFr", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-opseu-dark md:col-span-2">
            {t("internalNotes")}<textarea rows={3} maxLength={5000} className={fieldClass} value={form.internalNotes} onChange={(event) => setField("internalNotes", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-opseu-dark md:col-span-2">
            {t("verificationEvidence")}<textarea required rows={2} maxLength={2000} className={fieldClass} value={form.verificationEvidence} onChange={(event) => setField("verificationEvidence", event.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button className={buttonClass} type="submit" disabled={saving || hasPendingAction}>{saving ? t("saving") : selectedId ? t("saveChanges") : t("createRecord")}</button>
            {selectedId ? <button className={buttonClass} type="button" onClick={resetForm}>{t("cancelEdit")}</button> : null}
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-opseu-dark">{t("recordsHeading")}</h2>
        {loading ? <p className="mt-2 text-sm text-opseu-gray-dark">{t("loading")}</p> : null}
        {!loading && records.length === 0 ? <p className="mt-2 rounded-lg border border-opseu-gray/20 bg-white p-4 text-sm text-opseu-gray-dark">{t("empty")}</p> : null}
        <div className="mt-3 space-y-3">
          {records.map((record) => {
            const published = publishedIds.includes(record.id);
            const reviewInput = reviewForm(record);
            return (
              <article key={record.id} className="rounded-lg border border-opseu-gray/20 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-opseu-dark">{record.serviceName}</h3>
                    <p className="mt-1 text-sm text-opseu-gray-dark">{t("previewEn")}: {record.purpose.en}<br />{t("previewFr")}: {record.purpose.fr}</p>
                    <p className="mt-2 text-xs text-opseu-gray-dark">{t("reviewStatus")}: {statusLabel(record.reviewStatus)} · {t("dpaStatus")}: {statusLabel(record.dpaStatus)} · {published ? t("published") : t("notPublished")}</p>
                    <p className="mt-1 text-xs text-opseu-gray-dark">{t("regionSummary", { region: record.processingRegion, transfer: transferLabel(record.transferStatus) })}</p>
                  </div>
                  <button className={buttonClass} type="button" disabled={saving || hasPendingAction} onClick={() => edit(record)}>{t("edit")}</button>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-opseu-gray/10 pt-4 md:grid-cols-3">
                  <label className="text-sm font-medium text-opseu-dark md:col-span-1">
                    {t("reviewOwner")}<input className={fieldClass} disabled={hasPendingAction} value={reviewInput.reviewOwner} onChange={(event) => updateReviewForm(record, { reviewOwner: event.target.value })} placeholder={t("reviewOwnerPlaceholder")} />
                  </label>
                  <label className="text-sm font-medium text-opseu-dark">
                    {t("dpaStatus")}<select className={fieldClass} disabled={hasPendingAction} value={reviewInput.dpaStatus} onChange={(event) => updateReviewForm(record, { dpaStatus: event.target.value })}>
                      <option value="under_review">{t("status.under_review")}</option>
                      <option value="approved">{t("status.approved")}</option>
                      <option value="not_applicable">{t("status.not_applicable")}</option>
                      <option value="unreviewed">{t("status.unreviewed")}</option>
                    </select>
                  </label>
                  <label className="flex items-start gap-2 pt-6 text-sm text-opseu-dark">
                    <input type="checkbox" disabled={hasPendingAction} checked={reviewInput.confirmedDisclosure} onChange={(event) => updateReviewForm(record, { confirmedDisclosure: event.target.checked })} />
                    <span>{t("approvalAttestation")}</span>
                  </label>
                  <div className="flex flex-wrap gap-2 md:col-span-3">
                    <button className={buttonClass} type="button" disabled={saving || hasPendingAction} onClick={() => void review(record, true)}>{t("approve")}</button>
                    <button className={buttonClass} type="button" disabled={saving || hasPendingAction} onClick={() => void review(record, false)}>{t("reject")}</button>
                    <button className={buttonClass} type="button" disabled={saving || hasPendingAction} onClick={() => void togglePublication(record)}>{published ? t("withdraw") : t("publish")}</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {pendingPublication ? (
        <section className="rounded-lg border border-amber-700/30 bg-amber-50 p-4" aria-busy={saving} aria-labelledby="subprocessor-publication-step-up-title">
          <h2 id="subprocessor-publication-step-up-title" className="font-semibold text-opseu-dark">{t("publicationStepUpTitle")}</h2>
          <p className="mt-2 text-sm text-opseu-dark">
            {pendingPublication.published
              ? t("publicationPromptPublish", { serviceName: pendingPublication.serviceName })
              : t("publicationPromptWithdraw", { serviceName: pendingPublication.serviceName })}
          </p>
          {publicationUncertain ? (
            <button className={`${buttonClass} mt-3`} type="button" disabled={loading} onClick={() => void reloadPublicationStatus()}>
              {loading ? t("loading") : t("publicationReloadStatus")}
            </button>
          ) : publicationChallengeNeeded ? (
            <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={confirmPublication}>
              <label className="min-w-64 flex-1 text-sm font-medium text-opseu-dark">
                {t("publicationMfaCode")}
                <input
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={32}
                  disabled={saving}
                  className={fieldClass}
                  value={publicationMfaCode}
                  onChange={(event) => setPublicationMfaCode(event.target.value)}
                />
              </label>
              <button className={buttonClass} type="submit" disabled={saving || !publicationMfaCode.trim()}>
                {saving ? t("saving") : t("publicationConfirm")}
              </button>
              <button className={buttonClass} type="button" disabled={saving} onClick={cancelPublication}>{t("publicationCancel")}</button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-opseu-gray-dark" role="status">{t("publicationVerifying")}</p>
          )}
        </section>
      ) : null}

      {pendingReview ? (
        <section className="rounded-lg border border-amber-700/30 bg-amber-50 p-4" aria-busy={saving} aria-labelledby="subprocessor-review-step-up-title">
          <h2 id="subprocessor-review-step-up-title" className="font-semibold text-opseu-dark">{t("reviewStepUpTitle")}</h2>
          <p className="mt-2 text-sm text-opseu-dark">
            {pendingReview.reviewStatus === "approved"
              ? t("reviewPromptApprove", { serviceName: pendingReview.serviceName })
              : t("reviewPromptReject", { serviceName: pendingReview.serviceName })}
          </p>
          {reviewUncertain ? (
            <button className={`${buttonClass} mt-3`} type="button" disabled={loading} onClick={() => void reloadReviewStatus()}>
              {loading ? t("loading") : t("reviewReloadStatus")}
            </button>
          ) : reviewChallengeNeeded ? (
            <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={confirmReview}>
              <label className="min-w-64 flex-1 text-sm font-medium text-opseu-dark">
                {t("reviewMfaCode")}
                <input
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={32}
                  disabled={saving}
                  className={fieldClass}
                  value={reviewMfaCode}
                  onChange={(event) => setReviewMfaCode(event.target.value)}
                />
              </label>
              <button className={buttonClass} type="submit" disabled={saving || !reviewMfaCode.trim()}>
                {saving ? t("saving") : t("reviewConfirm")}
              </button>
              <button className={buttonClass} type="button" disabled={saving} onClick={cancelReview}>{t("reviewCancel")}</button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-opseu-gray-dark" role="status">{t("reviewVerifying")}</p>
          )}
        </section>
      ) : null}

      {message ? <p aria-live="polite" role="status" className="rounded-lg border border-opseu-gray/20 bg-white p-3 text-sm text-opseu-dark">{message}</p> : null}

      <section>
        <h2 className="text-lg font-semibold text-opseu-dark">{t("auditHeading")}</h2>
        {events.length === 0 ? <p className="mt-2 text-sm text-opseu-gray-dark">{t("auditEmpty")}</p> : (
          <ul className="mt-2 divide-y divide-opseu-gray/10 rounded-lg border border-opseu-gray/20 bg-white">
            {events.slice(0, 30).map((event) => (
              <li key={event.id} className="flex flex-wrap justify-between gap-2 px-3 py-2 text-xs text-opseu-gray-dark">
                <span>{event.action} · {event.providerId ?? t("registerAccess")}</span>
                <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
