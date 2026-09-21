"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type PrivacyMode = "standard" | "restricted";
type Participant = { id: string; userId: string; name: string | null; relationship: string; accessLevel: string; legacy?: boolean };
type AvailableMember = { userId: string; name: string; email: string };

export function GrievanceAccessPanel({ id, initialPrivacyMode, canManage }: { id: string; initialPrivacyMode: PrivacyMode; canManage: boolean }) {
  const t = useTranslations("grievance.accessPanel");
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>(initialPrivacyMode);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [relationship, setRelationship] = useState<"case_worker" | "representative" | "observer">("representative");
  const [accessLevel, setAccessLevel] = useState<"summary" | "case_read" | "case_write">("case_read");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [persistenceAvailable, setPersistenceAvailable] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch(`/api/grievances/${encodeURIComponent(id)}/participants`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json() as { privacyMode: PrivacyMode; participants: Participant[]; availableMembers: AvailableMember[]; persistenceAvailable?: boolean };
    setPrivacyMode(payload.privacyMode);
    setParticipants(payload.participants);
    setAvailableMembers(payload.availableMembers);
    setPersistenceAvailable(payload.persistenceAvailable !== false);
  }, [id]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function changePrivacy() {
    setBusy(true); setError("");
    const response = await fetch(`/api/grievances/${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privacyMode }),
    });
    if (!response.ok) setError(t("saveError"));
    setBusy(false);
    await load();
  }

  async function addParticipant(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedUserId) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/grievances/${encodeURIComponent(id)}/participants`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId, relationship, accessLevel: relationship === "case_worker" ? "case_write" : accessLevel }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setError(payload.error ?? t("saveError"));
    else setSelectedUserId("");
    setBusy(false);
    await load();
  }

  async function revoke(participantId: string) {
    setBusy(true); setError("");
    const response = await fetch(`/api/grievances/${encodeURIComponent(id)}/participants/${encodeURIComponent(participantId)}`, { method: "DELETE" });
    if (!response.ok) setError(t("saveError"));
    setBusy(false);
    await load();
  }

  return (
    <section aria-labelledby="grievance-access-heading" className="mt-5 space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <h2 id="grievance-access-heading" className="text-lg font-semibold text-opseu-dark">{t("title")}</h2>
        <p className="mt-1 text-sm text-gray-700">{t(privacyMode === "restricted" ? "restrictedHint" : "standardHint")}</p>
      </div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {!persistenceAvailable ? <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">{t("durableStorageRequired")}</p> : null}
      <div>
        <h3 className="text-sm font-semibold">{t("participants")}</h3>
        <ul className="mt-2 divide-y divide-gray-100">
          {participants.map((person) => (
            <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span><strong>{person.name ?? person.userId}</strong><span className="ml-2 text-gray-700">{t(`relationship.${person.relationship}`)} · {t(`level.${person.accessLevel}`)}</span></span>
              {canManage && persistenceAvailable && !person.legacy && person.relationship !== "member" ? <button type="button" disabled={busy} onClick={() => void revoke(person.id)} className="min-h-9 rounded border border-gray-300 px-3 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">{t("remove")}</button> : null}
            </li>
          ))}
          {participants.length === 0 ? <li className="py-2 text-sm text-gray-600">{t("noParticipants")}</li> : null}
        </ul>
      </div>
      {canManage ? (
        <>
          <div className="flex flex-col gap-3 rounded-md bg-gray-50 p-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm font-medium">{t("privacyLabel")}
              <select value={privacyMode} onChange={(event) => setPrivacyMode(event.target.value as PrivacyMode)} className="mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                <option value="standard">{t("standard")}</option><option value="restricted">{t("restricted")}</option>
              </select>
            </label>
            <button type="button" disabled={busy} onClick={() => void changePrivacy()} className="min-h-11 rounded-md bg-opseu-blue px-4 font-semibold text-white disabled:opacity-50">{t("savePrivacy")}</button>
          </div>
          {persistenceAvailable ? <form onSubmit={addParticipant} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">{t("personLabel")}
              <select required value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                <option value="">{t("choosePerson")}</option>{availableMembers.map((person) => <option key={person.userId} value={person.userId}>{person.name} · {person.email}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">{t("relationshipLabel")}
              <select value={relationship} onChange={(event) => {
                const next = event.target.value as typeof relationship;
                setRelationship(next);
                if (next === "case_worker") setAccessLevel("case_write");
              }} className="mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                <option value="case_worker">{t("relationship.case_worker")}</option><option value="representative">{t("relationship.representative")}</option><option value="observer">{t("relationship.observer")}</option>
              </select>
            </label>
            {relationship !== "case_worker" ? <label className="text-sm font-medium sm:col-span-2">{t("levelLabel")}
              <select value={accessLevel} onChange={(event) => setAccessLevel(event.target.value as typeof accessLevel)} className="mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                <option value="summary">{t("level.summary")}</option><option value="case_read">{t("level.case_read")}</option><option value="case_write">{t("level.case_write")}</option>
              </select>
            </label> : null}
            <div className="sm:col-span-2"><button disabled={!selectedUserId || busy} className="min-h-11 rounded-md border border-opseu-blue px-4 font-semibold text-opseu-blue disabled:opacity-50">{t("addParticipant")}</button></div>
          </form> : null}
        </>
      ) : null}
    </section>
  );
}

type MemberUpdate = { id: string; body: string; publishedAt: string };

export function GrievanceMemberUpdatesPanel({ id, canPublish }: { id: string; canPublish: boolean }) {
  const t = useTranslations("grievance.memberUpdates");
  const [updates, setUpdates] = useState<MemberUpdate[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [persistenceAvailable, setPersistenceAvailable] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch(`/api/grievances/${encodeURIComponent(id)}/member-updates`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json() as { updates: MemberUpdate[]; persistenceAvailable?: boolean };
    setUpdates(payload.updates);
    setPersistenceAvailable(payload.persistenceAvailable !== false);
  }, [id]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/grievances/${encodeURIComponent(id)}/member-updates`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setError(payload.error ?? t("saveError"));
    else setBody("");
    setBusy(false); await load();
  }

  async function withdraw(updateId: string) {
    setBusy(true); setError("");
    const response = await fetch(`/api/grievances/${encodeURIComponent(id)}/member-updates/${encodeURIComponent(updateId)}`, { method: "DELETE" });
    if (!response.ok) setError(t("saveError"));
    setBusy(false); await load();
  }

  return (
    <section aria-labelledby="grievance-member-updates-title" className="mt-5 space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <div><h2 id="grievance-member-updates-title" className="text-lg font-semibold text-opseu-dark">{t("title")}</h2><p className="mt-1 text-sm text-gray-700">{t("hint")}</p></div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {!persistenceAvailable ? <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">{t("durableStorageRequired")}</p> : null}
      {updates.length ? <ul className="space-y-2">{updates.map((update) => <li key={update.id} className="rounded-md bg-gray-50 p-3 text-sm"><p>{update.body}</p><time className="mt-1 block text-xs text-gray-600" dateTime={update.publishedAt}>{new Date(update.publishedAt).toLocaleString()}</time>{canPublish ? <button type="button" disabled={busy} onClick={() => void withdraw(update.id)} className="mt-2 min-h-9 rounded border border-gray-300 px-3 text-xs font-medium">{t("withdraw")}</button> : null}</li>)}</ul> : <p className="text-sm text-gray-600">{t("empty")}</p>}
      {canPublish && persistenceAvailable ? <form onSubmit={publish} className="space-y-2"><label className="block text-sm font-medium">{t("composeLabel")}<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} maxLength={4000} required className="mt-1 min-h-24 w-full rounded-md border border-gray-300 p-3" /></label><button disabled={busy || !body.trim()} className="min-h-10 rounded-md bg-opseu-blue px-4 font-semibold text-white disabled:opacity-50">{t("publish")}</button></form> : null}
    </section>
  );
}

export function GrievanceAttachmentShareToggle({ id, attachmentId }: { id: string; attachmentId: string }) {
  const t = useTranslations("grievance.accessPanel");
  const [shared, setShared] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [ready, setReady] = useState(false);
  const [persistenceAvailable, setPersistenceAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch(`/api/grievances/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}/share`, { cache: "no-store" });
    if (!response.ok) { setReady(false); return; }
    const payload = await response.json() as { shared: boolean; canManage: boolean; persistenceAvailable?: boolean };
    setShared(payload.shared); setCanManage(payload.canManage); setPersistenceAvailable(payload.persistenceAvailable !== false); setReady(true);
  }, [id, attachmentId]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function toggle() {
    setBusy(true); setError(false);
    const response = await fetch(`/api/grievances/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}/share`, { method: shared ? "DELETE" : "PUT" });
    if (!response.ok) setError(true);
    await load(); setBusy(false);
  }
  if (!ready) return null;
  if (!canManage) return shared ? <span className="text-xs text-gray-600">{t("sharedBadge")}</span> : null;
  if (!persistenceAvailable) return <span className="text-xs text-amber-800">{t("durableStorageRequired")}</span>;
  return <span className="inline-flex flex-col items-end gap-1"><button type="button" aria-pressed={shared} disabled={busy} onClick={() => void toggle()} className="min-h-9 rounded border border-gray-300 px-3 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">{shared ? t("unshareAttachment") : t("shareAttachment")}</button>{error ? <span role="alert" className="text-xs text-red-700">{t("saveError")}</span> : null}</span>;
}
