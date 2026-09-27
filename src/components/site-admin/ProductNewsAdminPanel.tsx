"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Campaign = {
  id: string; subjectEn: string; subjectFr: string; bodyEn: string; bodyFr: string;
  status: string; approvalReference: string | null; createdAt: string; releasedAt: string | null;
};
type DeliveryCount = { campaign_id: string; kind: string; status: string; error_code: string | null; count: number };
type Overview = {
  campaigns: Campaign[];
  counts: { confirmed: number; confirmed_en: number; confirmed_fr: number; pending: number; suppressed: number };
  deliveries: DeliveryCount[];
  providerEvents: Array<{ event_type: string; count: number }>;
  sending: { enabled: boolean; reason: string | null; noticeVersion: string | null };
};
type Evidence = {
  subscriber: { email: string; status: string } | null;
  events: Array<{ id: string; eventType: string; occurredAt: string; wordingVersion: string | null; wordingText: string | null; source: string; reason: string | null }>;
  deliveries: Array<{ campaignId: string; status: string; kind: string; finishedAt: string | null }>;
};

export function ProductNewsAdminPanel() {
  const t = useTranslations("productNewsAdmin");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [subjectEn, setSubjectEn] = useState("");
  const [subjectFr, setSubjectFr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyFr, setBodyFr] = useState("");
  const [approvalReference, setApprovalReference] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [releaseConfirmed, setReleaseConfirmed] = useState(false);
  const [evidenceEmail, setEvidenceEmail] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [evidence, setEvidence] = useState<Evidence | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/site-admin/product-news", { cache: "no-store" });
    if (!response.ok) throw new Error("load");
    setOverview(await response.json() as Overview);
  }, []);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/site-admin/product-news", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("load");
        const data = await response.json() as Overview;
        if (!cancelled) setOverview(data);
      })
      .catch(() => { if (!cancelled) setFeedback(t("error")); });
    return () => { cancelled = true; };
  }, [t]);

  async function campaignAction(payload: Record<string, unknown>) {
    setBusy(true); setFeedback("");
    try {
      const response = await fetch("/api/site-admin/product-news", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), cache: "no-store",
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("error"));
      setFeedback(t("saved"));
      if (payload.action === "release") setReleaseConfirmed(false);
      await load();
    } catch (error) { setFeedback(error instanceof Error ? error.message : t("error")); }
    finally { setBusy(false); }
  }

  async function evidenceAction(action: "search" | "export" | "correct") {
    setBusy(true); setFeedback("");
    try {
      const response = await fetch("/api/site-admin/product-news/evidence", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email: evidenceEmail, reason: correctionReason }), cache: "no-store",
      });
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? t("error"));
      }
      if (action === "export") {
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = url; link.download = "product-news-consent.csv"; link.click();
        URL.revokeObjectURL(url);
      } else if (action === "search") setEvidence(await response.json() as Evidence);
      else { setFeedback(t("corrected")); setEvidence(null); await load(); }
    } catch (error) { setFeedback(error instanceof Error ? error.message : t("error")); }
    finally { setBusy(false); }
  }

  return (
    <div className="mt-6 space-y-8">
      {overview ? (
        <section className="rounded-xl border border-opseu-gray/20 bg-white p-5">
          <h2 className="text-lg font-semibold">{t("readiness")}</h2>
          <p className="mt-2 text-sm">{overview.sending.enabled ? t("enabled") : t("disabled", { reason: overview.sending.reason ?? "unknown" })}</p>
          <p className="mt-2 text-sm">{t("counts", overview.counts)}</p>
          <p className="mt-2 text-sm">{t("providerEvents")}: {overview.providerEvents.map((event) => `${event.event_type}: ${event.count}`).join(" · ") || "0"}</p>
        </section>
      ) : null}

      <form onSubmit={(event) => {
        event.preventDefault();
        void campaignAction({ action: "create", subjectEn, subjectFr, bodyEn, bodyFr });
      }} className="space-y-3 rounded-xl border border-opseu-gray/20 bg-white p-5">
        <h2 className="text-lg font-semibold">{t("newCampaign")}</h2>
        <label className="block text-sm">{t("subjectEn")}<input required maxLength={180} value={subjectEn} onChange={(e) => setSubjectEn(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        <label className="block text-sm">{t("bodyEn")}<textarea required minLength={20} maxLength={12000} value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} className="mt-1 min-h-32 w-full rounded border p-2" /></label>
        <label className="block text-sm">{t("subjectFr")}<input required maxLength={180} value={subjectFr} onChange={(e) => setSubjectFr(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        <label className="block text-sm">{t("bodyFr")}<textarea required minLength={20} maxLength={12000} value={bodyFr} onChange={(e) => setBodyFr(e.target.value)} className="mt-1 min-h-32 w-full rounded border p-2" /></label>
        <button disabled={busy} className="rounded bg-opseu-blue px-4 py-2 text-white disabled:opacity-50">{t("saveDraft")}</button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("campaigns")}</h2>
        {overview?.campaigns.length === 0 ? <p className="text-sm">{t("noCampaigns")}</p> : null}
        {overview?.campaigns.map((campaign) => (
          <article key={campaign.id} className="rounded-xl border border-opseu-gray/20 bg-white p-5">
            <h3 className="font-semibold">{campaign.subjectEn}</h3>
            <p className="mt-1 text-sm">{t("status")}: {campaign.status} · {campaign.id}</p>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium">{t("preview")}</summary>
              <p className="mt-2">{t("previewCount", { count: overview?.counts.confirmed ?? 0, en: overview?.counts.confirmed_en ?? 0, fr: overview?.counts.confirmed_fr ?? 0 })}</p>
              <p className="mt-3 font-semibold">{campaign.subjectEn}</p><p className="whitespace-pre-wrap">{campaign.bodyEn}</p>
              <p className="mt-3 font-semibold">{campaign.subjectFr}</p><p className="whitespace-pre-wrap">{campaign.bodyFr}</p>
            </details>
            <p className="mt-3 text-xs text-opseu-gray-dark">{t("sendLog")}: {overview?.deliveries.filter((item) => item.campaign_id === campaign.id)
              .map((item) => `${item.kind}/${item.status}${item.error_code ? `/${item.error_code}` : ""}: ${item.count}`).join(" · ") || "0"}</p>
            {campaign.status === "draft" ? (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="text-sm">{t("approvalReference")}<input value={approvalReference} onChange={(e) => setApprovalReference(e.target.value)} minLength={8} className="mt-1 block rounded border p-2" /></label>
                <button type="button" disabled={busy || approvalReference.trim().length < 8} onClick={() => void campaignAction({ action: "approve", campaignId: campaign.id, approvalReference })}
                  className="rounded border border-opseu-blue px-3 py-2 text-sm text-opseu-blue disabled:opacity-50">{t("approve")}</button>
              </div>
            ) : null}
            {campaign.status === "approved" ? (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="text-sm">{t("testAddress")}<input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="mt-1 block rounded border p-2" /></label>
                <button type="button" disabled={busy || !testEmail} onClick={() => void campaignAction({ action: "test", campaignId: campaign.id, email: testEmail })}
                  className="rounded border border-opseu-blue px-3 py-2 text-sm text-opseu-blue disabled:opacity-50">{t("testSend")}</button>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={releaseConfirmed} onChange={(e) => setReleaseConfirmed(e.target.checked)} />{t("releaseConfirm")}</label>
                <button type="button" disabled={busy || !overview?.sending.enabled || !releaseConfirmed} onClick={() => void campaignAction({ action: "release", campaignId: campaign.id, confirmRelease: true })}
                  className="rounded bg-opseu-blue px-3 py-2 text-sm text-white disabled:opacity-50">{t("release")}</button>
              </div>
            ) : null}
            {campaign.status === "released" ? <button type="button" disabled={busy} onClick={() => void campaignAction({ action: "pause", campaignId: campaign.id })}
              className="mt-3 rounded border px-3 py-2 text-sm disabled:opacity-50">{t("pause")}</button> : null}
            {campaign.status === "paused" ? <button type="button" disabled={busy} onClick={() => void campaignAction({ action: "resume", campaignId: campaign.id })}
              className="mt-3 rounded border px-3 py-2 text-sm disabled:opacity-50">{t("resume")}</button> : null}
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-opseu-gray/20 bg-white p-5">
        <h2 className="text-lg font-semibold">{t("consentEvidence")}</h2>
        <label className="mt-3 block text-sm">{t("exactAddress")}<input type="email" value={evidenceEmail} onChange={(e) => setEvidenceEmail(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={busy || !evidenceEmail} onClick={() => void evidenceAction("search")} className="rounded border px-3 py-2 text-sm">{t("search")}</button>
          <button type="button" disabled={busy || !evidenceEmail} onClick={() => void evidenceAction("export")} className="rounded border px-3 py-2 text-sm">{t("export")}</button>
        </div>
        {evidence ? <div className="mt-4 text-sm">
          <p>{evidence.subscriber ? `${evidence.subscriber.email} · ${evidence.subscriber.status}` : t("noAddress")}</p>
          <ul className="mt-2 space-y-2">
            {evidence.events.map((event) => <li key={event.id} className="border-t pt-2">
              {event.eventType} · {event.occurredAt} · {event.source}
              {event.wordingVersion ? <p>{event.wordingVersion}: {event.wordingText}</p> : null}
              {event.reason ? <p>{event.reason}</p> : null}
            </li>)}
          </ul>
        </div> : null}
        <label className="mt-5 block text-sm">{t("correctionReason")}<textarea value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)}
          className="mt-1 w-full rounded border p-2" /></label>
        <button type="button" disabled={busy || !evidenceEmail || correctionReason.trim().length < 8}
          onClick={() => void evidenceAction("correct")} className="mt-2 rounded border border-red-700 px-3 py-2 text-sm text-red-700 disabled:opacity-50">{t("suppress")}</button>
      </section>
      {feedback ? <p role="status" aria-live="polite" className="text-sm">{feedback}</p> : null}
    </div>
  );
}
