"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

type Incident = {
  id: string;
  kind: string;
  occurredAt: string | null;
  discoveredAt: string;
  affectedSystem: string;
  dataCategories: string[];
  affectedPartyCategories: string[];
  affectedIndividualEstimate: number | null;
  severity: string;
  scopeSummary: string;
  containmentSummary: string;
  riskAssessment: string;
  notificationDecision: string;
  notificationDecisionAt: string | null;
  notificationRationale: string;
  remediationSummary: string;
  lessonsLearned: string;
  status: string;
  closedAt: string | null;
  lastReviewedAt: string | null;
  updatedAt: string;
};

type AuditEvent = {
  id: string;
  actorId: string;
  incidentId: string | null;
  requestId: string;
  action: string;
  outcome: string;
  createdAt: string;
};

type FormState = Omit<Incident, "id" | "closedAt" | "updatedAt" | "discoveredAt" | "dataCategories" | "occurredAt" | "affectedPartyCategories" | "affectedIndividualEstimate" | "lastReviewedAt" | "notificationDecisionAt"> & {
  occurredAt: string;
  discoveredAt: string;
  dataCategories: string;
  affectedPartyCategories: string[];
  affectedIndividualEstimate: string;
  lastReviewedAt: string;
  notificationDecisionAt: string;
};

function emptyForm(): FormState {
  return {
    kind: "privacy",
    occurredAt: "",
    discoveredAt: "",
    affectedSystem: "",
    dataCategories: "",
    affectedPartyCategories: ["unknown"],
    affectedIndividualEstimate: "",
    severity: "moderate",
    scopeSummary: "",
    containmentSummary: "",
    riskAssessment: "",
    notificationDecision: "not_assessed",
    notificationDecisionAt: "",
    notificationRationale: "",
    remediationSummary: "",
    lessonsLearned: "",
    status: "open",
    lastReviewedAt: "",
  };
}

function toLocalDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function asForm(record: Incident): FormState {
  return {
    kind: record.kind,
    occurredAt: toLocalDateTime(record.occurredAt),
    discoveredAt: toLocalDateTime(record.discoveredAt),
    affectedSystem: record.affectedSystem,
    dataCategories: record.dataCategories.join("\n"),
    affectedPartyCategories: record.affectedPartyCategories,
    affectedIndividualEstimate: record.affectedIndividualEstimate === null ? "" : String(record.affectedIndividualEstimate),
    severity: record.severity,
    scopeSummary: record.scopeSummary,
    containmentSummary: record.containmentSummary,
    riskAssessment: record.riskAssessment,
    notificationDecision: record.notificationDecision,
    notificationDecisionAt: toLocalDateTime(record.notificationDecisionAt),
    notificationRationale: record.notificationRationale,
    remediationSummary: record.remediationSummary,
    lessonsLearned: record.lessonsLearned,
    status: record.status,
    lastReviewedAt: record.lastReviewedAt?.slice(0, 10) ?? "",
  };
}

async function responseError(response: Response, fallback: string): Promise<string> {
  await response.json().catch(() => null);
  return fallback;
}

export function PlatformIncidentRegisterPanel({ locale }: { locale: string }) {
  const t = useTranslations("hub.platformOperator.incidents");
  const [code, setCode] = useState("");
  const [records, setRecords] = useState<Incident[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      setRecords([]);
      setEvents([]);
      setSelectedId(null);
      setForm(emptyForm());
      setCode("");
      setLoaded(false);
      setMessage(t("lockedTimeout"));
    }, 5 * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [loaded, form, selectedId, code, t]);

  async function getStepUp(action: "view" | "create" | "update" | "export", resourceId?: string) {
    const response = await fetch("/api/site-admin/incidents/step-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ code, action, ...(resourceId ? { resourceId } : {}) }),
    });
    if (!response.ok) {
      setCode("");
      throw new Error(response.status === 429 ? t("rateLimited") : await responseError(response, t("requestFailed")));
    }
    const payload = await response.json() as { token: string };
    setCode("");
    return payload.token;
  }

  async function loadRegister(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const token = await getStepUp("view");
      const response = await fetch("/api/site-admin/incidents", {
        headers: { "X-Incident-Step-Up": token }, cache: "no-store",
      });
      if (!response.ok) throw new Error(await responseError(response, t("loadFailed")));
      const payload = await response.json() as { records: Incident[]; events: AuditEvent[] };
      setRecords(payload.records ?? []);
      setEvents(payload.events ?? []);
      setLoaded(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("loadFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const action = selectedId ? "update" : "create";
      const token = await getStepUp(action, selectedId ?? undefined);
      const payload = {
        ...form,
        occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : null,
        discoveredAt: new Date(form.discoveredAt).toISOString(),
        dataCategories: form.dataCategories.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
        affectedIndividualEstimate: form.affectedIndividualEstimate === "" ? null : Number(form.affectedIndividualEstimate),
        lastReviewedAt: form.lastReviewedAt || null,
        notificationDecisionAt: form.notificationDecisionAt
          ? new Date(form.notificationDecisionAt).toISOString()
          : null,
        ...(selectedId ? {} : { status: "open" }),
      };
      const response = await fetch(selectedId ? `/api/site-admin/incidents/${selectedId}` : "/api/site-admin/incidents", {
        method: selectedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "X-Incident-Step-Up": token },
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await responseError(response, t("saveFailed")));
      const result = await response.json() as { record: Incident; event: AuditEvent };
      setRecords((current) => [result.record, ...current.filter((item) => item.id !== result.record.id)]);
      setEvents((current) => [result.event, ...current].slice(0, 200));
      setSelectedId(result.record.id);
      setForm(asForm(result.record));
      setMessage(t("saved"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function exportRecord(record: Incident) {
    setBusy(true);
    setMessage("");
    try {
      const token = await getStepUp("export", record.id);
      const response = await fetch(`/api/site-admin/incidents/${record.id}/export`, {
        method: "POST", headers: { "X-Incident-Step-Up": token }, cache: "no-store",
      });
      if (!response.ok) throw new Error(await responseError(response, t("exportFailed")));
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `incident-${record.id}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setMessage(t("exported"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("exportFailed"));
    } finally {
      setBusy(false);
    }
  }

  function edit(record: Incident) {
    setSelectedId(record.id);
    setForm(asForm(record));
  }

  function startNew() {
    setSelectedId(null);
    setForm(emptyForm());
  }

  function lockRegister() {
    setRecords([]);
    setEvents([]);
    setSelectedId(null);
    setForm(emptyForm());
    setCode("");
    setLoaded(false);
  }

  const inputClass = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950";
  const labelClass = "block text-sm font-medium text-slate-800";

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">{t("sensitivityTitle")}</p>
        <p className="mt-1">{t("sensitivityBody")}</p>
      </div>

      {!loaded ? (
        <form onSubmit={loadRegister} className="max-w-xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-950">{t("unlockTitle")}</h2>
          <p className="mt-1 text-sm text-slate-700">{t("unlockBody")}</p>
          <label className={`${labelClass} mt-4`}>
            {t("totpCode")}
            <input className={inputClass} type="password" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required />
          </label>
          <button className="mt-4 rounded-md bg-opseu-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || code.length !== 6}>
            {busy ? t("working") : t("unlock")}
          </button>
        </form>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">{t("recordsTitle")}</h2>
            <div className="flex gap-2">
              <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800" onClick={startNew}>{t("newIncident")}</button>
              <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800" onClick={lockRegister}>{t("lock")}</button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="space-y-3">
              {records.length === 0 ? <p className="rounded-lg border border-slate-200 p-4 text-sm text-slate-700">{t("empty")}</p> : records.map((record) => (
                <article key={record.id} className={`rounded-lg border p-4 ${selectedId === record.id ? "border-opseu-blue bg-blue-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button type="button" className="min-w-0 text-left" onClick={() => edit(record)}>
                      <span className="block font-semibold text-slate-950">{record.affectedSystem} · {t(`kind.${record.kind}`)}</span>
                      <span className="mt-1 block text-sm text-slate-700">{new Date(record.discoveredAt).toLocaleString(locale)} · {t(`severity.${record.severity}`)} · {t(`status.${record.status}`)}</span>
                      <span className="mt-2 block text-sm text-slate-700">{record.scopeSummary}</span>
                    </button>
                    <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium" aria-label={t("exportFor", { system: record.affectedSystem })} disabled={busy} onClick={() => void exportRecord(record)}>{t("export")}</button>
                  </div>
                </article>
              ))}
            </div>

            <form onSubmit={save} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-slate-950">{selectedId ? t("editTitle") : t("newTitle")}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>{t("kindLabel")}<select className={inputClass} value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>{(["privacy", "security", "availability", "other"] as const).map((value) => <option key={value} value={value}>{t(`kind.${value}`)}</option>)}</select></label>
                <label className={labelClass}>{t("severityLabel")}<select className={inputClass} value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}>{(["low", "moderate", "high", "critical"] as const).map((value) => <option key={value} value={value}>{t(`severity.${value}`)}</option>)}</select></label>
                <label className={labelClass}>{t("occurredAt")}<input className={inputClass} type="datetime-local" value={form.occurredAt} onChange={(event) => setForm({ ...form, occurredAt: event.target.value })} /></label>
                <label className={labelClass}>{t("discoveredAt")}<input className={inputClass} type="datetime-local" value={form.discoveredAt} onChange={(event) => setForm({ ...form, discoveredAt: event.target.value })} required /></label>
                <label className={labelClass}>{t("affectedSystem")}<input className={inputClass} value={form.affectedSystem} maxLength={160} onChange={(event) => setForm({ ...form, affectedSystem: event.target.value })} required /></label>
                <label className={`${labelClass} sm:col-span-2`}>{t("dataCategories")}<textarea className={inputClass} rows={2} value={form.dataCategories} onChange={(event) => setForm({ ...form, dataCategories: event.target.value })} required /></label>
                <fieldset className="sm:col-span-2">
                  <legend className={labelClass}>{t("affectedPartyCategories")}</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {(["members", "officers", "staff", "customer_administrators", "public_visitors", "unknown", "other"] as const).map((value) => (
                      <label key={value} className="flex items-start gap-2 text-sm text-slate-800">
                        <input type="checkbox" className="mt-1" checked={form.affectedPartyCategories.includes(value)} onChange={(event) => {
                          if (!event.target.checked && form.affectedPartyCategories.length === 1) return;
                          setForm({
                            ...form,
                            affectedPartyCategories: event.target.checked
                              ? [...form.affectedPartyCategories, value]
                              : form.affectedPartyCategories.filter((item) => item !== value),
                          });
                        }} />
                        <span>{t(`affectedParty.${value}`)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className={labelClass}>{t("affectedIndividualEstimate")}<input className={inputClass} type="number" min={0} step={1} value={form.affectedIndividualEstimate} onChange={(event) => setForm({ ...form, affectedIndividualEstimate: event.target.value })} /></label>
                <label className={`${labelClass} sm:col-span-2`}>{t("scopeSummary")}<textarea className={inputClass} rows={3} value={form.scopeSummary} onChange={(event) => setForm({ ...form, scopeSummary: event.target.value })} required /></label>
                <label className={`${labelClass} sm:col-span-2`}>{t("containmentSummary")}<textarea className={inputClass} rows={3} value={form.containmentSummary} onChange={(event) => setForm({ ...form, containmentSummary: event.target.value })} required /></label>
                <label className={`${labelClass} sm:col-span-2`}>{t("riskAssessment")}<textarea className={inputClass} rows={3} value={form.riskAssessment} onChange={(event) => setForm({ ...form, riskAssessment: event.target.value })} required /></label>
                <label className={labelClass}>{t("notificationDecision")}<select className={inputClass} value={form.notificationDecision} onChange={(event) => setForm({ ...form, notificationDecision: event.target.value, notificationDecisionAt: event.target.value === "not_assessed" ? "" : form.notificationDecisionAt })}>{(["not_assessed", "not_required", "required", "completed"] as const).map((value) => <option key={value} value={value}>{t(`notification.${value}`)}</option>)}</select></label>
                <label className={labelClass}>{t("notificationDecisionAt")}<input className={inputClass} type="datetime-local" value={form.notificationDecisionAt} onChange={(event) => setForm({ ...form, notificationDecisionAt: event.target.value })} required={form.notificationDecision !== "not_assessed"} disabled={form.notificationDecision === "not_assessed"} /></label>
                <label className={labelClass}>{t("statusLabel")}<select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{(["open", "contained", "closed"] as const).map((value) => <option key={value} value={value}>{t(`status.${value}`)}</option>)}</select></label>
                <label className={`${labelClass} sm:col-span-2`}>{t("notificationRationale")}<textarea className={inputClass} rows={3} value={form.notificationRationale} onChange={(event) => setForm({ ...form, notificationRationale: event.target.value })} required /></label>
                <label className={`${labelClass} sm:col-span-2`}>{t("remediationSummary")}<textarea className={inputClass} rows={3} value={form.remediationSummary} onChange={(event) => setForm({ ...form, remediationSummary: event.target.value })} required /></label>
                <label className={`${labelClass} sm:col-span-2`}>{t("lessonsLearned")}<textarea className={inputClass} rows={3} value={form.lessonsLearned} onChange={(event) => setForm({ ...form, lessonsLearned: event.target.value })} required /></label>
                <label className={labelClass}>{t("lastReviewedAt")}<input className={inputClass} type="date" value={form.lastReviewedAt} onChange={(event) => setForm({ ...form, lastReviewedAt: event.target.value })} /></label>
              </div>
              <label className={labelClass}>{t("totpCode")}<input className={inputClass} type="password" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required /></label>
              <button className="rounded-md bg-opseu-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || code.length !== 6}>{busy ? t("working") : t("save")}</button>
            </form>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-950">{t("auditTitle")}</h2>
            {events.length === 0 ? <p className="mt-2 text-sm text-slate-700">{t("auditEmpty")}</p> : (
              <ul className="mt-3 divide-y divide-slate-200">
                {events.map((item) => <li key={item.id} className="py-2 text-sm text-slate-700">
                  <span className="font-medium text-slate-900">{t(`auditAction.${item.action}`)}</span> · {new Date(item.createdAt).toLocaleString(locale)} · {t(`auditOutcome.${item.outcome}`)} · {item.actorId} · {item.requestId}
                </li>)}
              </ul>
            )}
          </section>
        </>
      )}
      {message ? <p role="status" className="rounded-md bg-slate-100 p-3 text-sm text-slate-800">{message}</p> : null}
    </section>
  );
}
