"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type Member = { id: string; userId: string; name: string; email: string; status: "active" | "inactive"; accountStatus: "active" | "locked" | "archived"; isPrimary: boolean; startedAt: string; endedAt: string | null };
type Candidate = { id: string; name: string; email: string };
type Office = { id: string; userId: string; name: string; email: string; position: string; officerRosterId: string | null; startsAt: string; endsAt: string | null; revokedAt: string | null; isActive: boolean };
type RosterEntry = { id: string; name: string; role: string; userId: string | null; canonicalPosition: string | null };
type Delegation = { id: string; delegateUserId: string; delegateName: string; capability: string; startsAt: string; endsAt: string; reason: string; revokedAt: string | null; isActive: boolean };
type EffectiveAccess = { offices: Array<{ position: string }>; delegations: Array<{ capability: string; endsAt: string }>; capabilities: Array<{ capability: string; reason: string }> };

const POSITIONS = ["president", "vice_president", "grievance_officer", "steward", "executive_member"] as const;
const CAPABILITIES = ["grievances.case.read", "grievances.case.write", "grievances.member_updates.publish"] as const;

export function OrganizationManager({ localId }: { localId: string }) {
  const t = useTranslations("organization");
  const [members, setMembers] = useState<Member[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [rosterEntries, setRosterEntries] = useState<RosterEntry[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [effectiveAccess, setEffectiveAccess] = useState<EffectiveAccess | null>(null);
  const [memberUserId, setMemberUserId] = useState("");
  const [officeUserId, setOfficeUserId] = useState("");
  const [position, setPosition] = useState<(typeof POSITIONS)[number]>("steward");
  const [officeRosterId, setOfficeRosterId] = useState("");
  const [officeStartsAt, setOfficeStartsAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [officeEndsAt, setOfficeEndsAt] = useState("");
  const [delegateUserId, setDelegateUserId] = useState("");
  const [capability, setCapability] = useState<(typeof CAPABILITIES)[number]>(CAPABILITIES[0]);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const query = useMemo(() => `?localId=${encodeURIComponent(localId)}`, [localId]);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [memberResponse, officeResponse, delegationResponse, accessResponse] = await Promise.all([
        fetch(`/api/organization/memberships${query}`, { cache: "no-store" }),
        fetch(`/api/organization/officers${query}`, { cache: "no-store" }),
        fetch(`/api/organization/delegations${query}`, { cache: "no-store" }),
        fetch(`/api/organization/effective-access${query}`, { cache: "no-store" }),
      ]);
      const [memberData, officeData, delegationData, accessData] = await Promise.all([
        memberResponse.json(), officeResponse.json(), delegationResponse.json(), accessResponse.json(),
      ]);
      if (!memberResponse.ok || !officeResponse.ok || !delegationResponse.ok || !accessResponse.ok) {
        throw new Error(memberData.error ?? officeData.error ?? delegationData.error ?? accessData.error ?? t("loadError"));
      }
      setMembers(memberData.memberships);
      setCandidates(memberData.candidates);
      setOffices(officeData.assignments);
      setRosterEntries(officeData.rosterEntries ?? []);
      setDelegations(delegationData.delegations);
      setEffectiveAccess(accessData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [query, t]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function submit(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? t("saveError"));
      setNotice(t("saved"));
      if (url === "/api/organization/officers" && method === "POST") {
        setOfficeRosterId("");
        setOfficeEndsAt("");
        setOfficeStartsAt(new Date().toISOString().slice(0, 10));
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("saveError"));
    } finally {
      setBusy(false);
    }
  }

  const activeMembers = members.filter((member) => member.status === "active" && !member.endedAt);
  const activeOffices = offices.filter((office) => office.isActive);
  const activeDelegations = delegations.filter((delegation) => delegation.isActive);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-opseu-blue">{t("eyebrow")}</p>
        <h1 className="mt-1 text-2xl font-bold text-opseu-dark">{t("title")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-700">{t("intro")}</p>
      </header>

      {effectiveAccess ? (
        <section aria-labelledby="org-effective-access-title" className="rounded-lg border border-blue-200 bg-blue-50 p-4 sm:p-5">
          <h2 id="org-effective-access-title" className="text-lg font-semibold text-opseu-dark">{t("yourAccessTitle")}</h2>
          <p className="mt-1 text-sm text-gray-700">{t("yourAccessHint")}</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold">{t("effectiveOffices")}</h3>
              <ul className="mt-1 space-y-1 text-sm">{effectiveAccess.offices.map((office, index) => <li key={`${office.position}-${index}`}>{t(`position.${office.position}`)}</li>)}{effectiveAccess.offices.length === 0 ? <li className="text-gray-600">{t("none")}</li> : null}</ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t("effectiveCapabilities")}</h3>
              <ul className="mt-1 space-y-1 text-sm">{effectiveAccess.capabilities.map((item) => <li key={item.capability}><strong>{t(`capability.${item.capability}`)}</strong><span className="block text-xs text-gray-700">{t(`accessReason.${item.reason}`)}</span></li>)}{effectiveAccess.capabilities.length === 0 ? <li className="text-gray-600">{t("none")}</li> : null}</ul>
            </div>
          </div>
        </section>
      ) : null}

      {error ? <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}
      {notice ? <p role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900">{notice}</p> : null}
      {loading ? <p role="status" className="text-sm text-gray-600">{t("loading")}</p> : null}

      <section aria-labelledby="org-members-title" className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
        <div>
          <h2 id="org-members-title" className="text-lg font-semibold text-opseu-dark">{t("membersTitle")}</h2>
          <p className="mt-1 text-sm text-gray-600">{t("membersHint")}</p>
        </div>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => {
          event.preventDefault();
          if (memberUserId) void submit("/api/organization/memberships", "POST", { localId, userId: memberUserId });
        }}>
          <label className="min-w-0 flex-1 text-sm font-medium">
            {t("addMemberLabel")}
            <select className="mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3" value={memberUserId} onChange={(event) => setMemberUserId(event.target.value)}>
              <option value="">{t("chooseMember")}</option>
              {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.email}</option>)}
            </select>
          </label>
          <button disabled={!memberUserId || busy} className="min-h-11 rounded-md bg-opseu-blue px-4 font-semibold text-white disabled:opacity-50">{t("addMember")}</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead><tr className="border-b text-gray-600"><th className="py-2 pr-3">{t("person")}</th><th className="py-2 pr-3">{t("statusLabel")}</th><th className="py-2 pr-3">{t("accountStatus")}</th><th className="py-2 pr-3">{t("primaryLocal")}</th><th className="py-2">{t("actions")}</th></tr></thead>
            <tbody>{members.map((member) => (
              <tr key={member.id} className="border-b last:border-0">
                <td className="py-3 pr-3"><span className="font-medium">{member.name}</span><span className="block text-xs text-gray-600">{member.email}</span></td>
                <td className="py-3 pr-3">{t(member.status === "active" && !member.endedAt ? "active" : "inactive")}</td>
                <td className="py-3 pr-3">{t(`account.${member.accountStatus}`)}</td>
                <td className="py-3 pr-3">{member.isPrimary ? t("yes") : t("no")}</td>
                <td className="py-3"><div className="flex flex-wrap gap-2">{!member.isPrimary && member.status === "active" && !member.endedAt ? <button type="button" disabled={busy} onClick={() => void submit(`/api/organization/memberships/${encodeURIComponent(member.id)}`, "PATCH", { localId, isPrimary: true })} className="min-h-10 rounded border border-gray-300 px-3 text-sm hover:bg-gray-50 disabled:opacity-50">{t("setPrimary")}</button> : null}{member.status === "active" && !member.endedAt ? <button type="button" disabled={busy} onClick={() => void submit(`/api/organization/memberships/${encodeURIComponent(member.id)}`, "PATCH", { localId, status: "inactive" })} className="min-h-10 rounded border border-gray-300 px-3 text-sm hover:bg-gray-50 disabled:opacity-50">{t("endMembership")}</button> : null}</div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="org-offices-title" className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
        <div>
          <h2 id="org-offices-title" className="text-lg font-semibold text-opseu-dark">{t("officesTitle")}</h2>
          <p className="mt-1 text-sm text-gray-600">{t("officesHint")}</p>
        </div>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(event) => {
          event.preventDefault();
          if (officeUserId) void submit("/api/organization/officers", "POST", {
            localId,
            userId: officeUserId,
            position,
            startsAt: new Date(officeStartsAt).toISOString(),
            ...(officeEndsAt ? { endsAt: new Date(officeEndsAt).toISOString() } : {}),
            ...(officeRosterId ? { officerRosterId: officeRosterId } : {}),
          });
        }}>
          <label className="text-sm font-medium">{t("person")}<select className="mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3" value={officeUserId} onChange={(event) => setOfficeUserId(event.target.value)}><option value="">{t("chooseMember")}</option>{activeMembers.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}</select></label>
          <label className="text-sm font-medium">{t("officeLabel")}<select className="mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3" value={position} onChange={(event) => setPosition(event.target.value as (typeof POSITIONS)[number])}>{POSITIONS.map((office) => <option key={office} value={office}>{t(`position.${office}`)}</option>)}</select></label>
          <label className="text-sm font-medium">{t("officeStartsLabel")}<input required type="date" className="mt-1 min-h-11 w-full rounded-md border border-gray-300 px-3" value={officeStartsAt} onChange={(event) => setOfficeStartsAt(event.target.value)} /></label>
          <label className="text-sm font-medium">{t("officeEndsLabel")}<input type="date" className="mt-1 min-h-11 w-full rounded-md border border-gray-300 px-3" value={officeEndsAt} onChange={(event) => setOfficeEndsAt(event.target.value)} /></label>
          <label className="text-sm font-medium">{t("rosterLinkLabel")}<select className="mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3" value={officeRosterId} onChange={(event) => setOfficeRosterId(event.target.value)}><option value="">{t("noRosterLink")}</option>{rosterEntries.filter((entry) => !entry.userId || entry.userId === officeUserId).map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.role}</option>)}</select></label>
          <button disabled={!officeUserId || !officeStartsAt || busy} className="min-h-11 self-end rounded-md bg-opseu-blue px-4 font-semibold text-white disabled:opacity-50">{t("assignOffice")}</button>
        </form>
        <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
          <p>{t("rosterLinkHint")}</p>
          {rosterEntries.length > 0 ? <ul className="mt-2 space-y-1">{rosterEntries.map((entry) => <li key={entry.id} className="flex flex-wrap items-center gap-2"><span>{entry.name} · {entry.role}</span><span className={`rounded px-2 py-0.5 text-xs ${entry.userId ? "bg-green-100 text-green-900" : "bg-amber-100 text-amber-950"}`}>{entry.userId ? t("linked") : t("displayOnly")}</span></li>)}</ul> : <p className="mt-2 text-gray-600">{t("noRosterEntries")}</p>}
        </div>
        <ul className="divide-y divide-gray-100">
          {activeOffices.map((office) => <li key={office.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span><strong>{office.name}</strong><span className="ml-2 text-gray-700">{t(`position.${office.position}`)}</span><span className="mt-1 block text-xs text-gray-600">{new Date(office.startsAt).toLocaleDateString()}{office.endsAt ? ` – ${new Date(office.endsAt).toLocaleDateString()}` : ` · ${t("noEndDate")}`}</span>{office.officerRosterId ? <span className="mt-1 block text-xs text-gray-600">{t("linkedRoster")}: {rosterEntries.find((entry) => entry.id === office.officerRosterId)?.name ?? office.officerRosterId}</span> : null}</span><button type="button" disabled={busy} onClick={() => void submit(`/api/organization/officers/${encodeURIComponent(office.id)}`, "DELETE", { localId })} className="min-h-10 rounded border border-gray-300 px-3 text-sm hover:bg-gray-50 disabled:opacity-50">{t("revoke")}</button></li>)}
          {activeOffices.length === 0 ? <li className="py-3 text-sm text-gray-600">{t("noOffices")}</li> : null}
        </ul>
      </section>

      <section aria-labelledby="org-delegations-title" className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
        <div>
          <h2 id="org-delegations-title" className="text-lg font-semibold text-opseu-dark">{t("delegationsTitle")}</h2>
          <p className="mt-1 text-sm text-gray-600">{t("delegationsHint")}</p>
        </div>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => {
          event.preventDefault();
          if (delegateUserId && startsAt && endsAt && reason.trim()) void submit("/api/organization/delegations", "POST", { localId, delegateUserId, capability, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), reason });
        }}>
          <label className="text-sm font-medium">{t("delegateLabel")}<select className="mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3" value={delegateUserId} onChange={(event) => setDelegateUserId(event.target.value)}><option value="">{t("chooseMember")}</option>{activeMembers.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}</select></label>
          <label className="text-sm font-medium">{t("capabilityLabel")}<select className="mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3" value={capability} onChange={(event) => setCapability(event.target.value as (typeof CAPABILITIES)[number])}>{CAPABILITIES.map((cap) => <option key={cap} value={cap}>{t(`capability.${cap}`)}</option>)}</select></label>
          <label className="text-sm font-medium">{t("startsLabel")}<input required type="datetime-local" className="mt-1 min-h-11 w-full rounded-md border border-gray-300 px-3" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
          <label className="text-sm font-medium">{t("expiresLabel")}<input required type="datetime-local" className="mt-1 min-h-11 w-full rounded-md border border-gray-300 px-3" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label>
          <label className="text-sm font-medium md:col-span-2">{t("reasonLabel")}<textarea required minLength={8} maxLength={1000} className="mt-1 min-h-24 w-full rounded-md border border-gray-300 p-3" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <div className="md:col-span-2"><button disabled={!delegateUserId || !startsAt || !endsAt || !reason.trim() || busy} className="min-h-11 rounded-md bg-opseu-blue px-4 font-semibold text-white disabled:opacity-50">{t("createDelegation")}</button></div>
        </form>
        <ul className="divide-y divide-gray-100">
          {activeDelegations.map((delegation) => <li key={delegation.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm"><span><strong>{delegation.delegateName}</strong><span className="ml-2 text-gray-700">{t(`capability.${delegation.capability}`)}</span><span className="mt-1 block text-xs text-gray-600">{new Date(delegation.startsAt).toLocaleString()} – {new Date(delegation.endsAt).toLocaleString()}</span><span className="mt-1 block text-gray-700">{delegation.reason}</span></span><button type="button" disabled={busy} onClick={() => void submit(`/api/organization/delegations/${encodeURIComponent(delegation.id)}`, "DELETE", { localId })} className="min-h-10 rounded border border-gray-300 px-3 text-sm hover:bg-gray-50 disabled:opacity-50">{t("revoke")}</button></li>)}
          {activeDelegations.length === 0 ? <li className="py-3 text-sm text-gray-600">{t("noDelegations")}</li> : null}
        </ul>
      </section>
    </div>
  );
}
