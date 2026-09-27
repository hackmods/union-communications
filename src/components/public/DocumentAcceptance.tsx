"use client";

import { useCallback, useEffect, useState } from "react";

type Requirement = { slug: string; title: string; versionId: string; acceptanceScope: "individual" | "organization" };
type PartyAcceptance = { scope: "union" | "local"; versionId: string; title: string; acceptedAt: string | null };
type Scope = "individual" | "union" | "local";

export function DocumentAcceptance({ locale, returnTo }: { locale: string; returnTo: string }) {
  const fr = locale === "fr";
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [partyAcceptances, setPartyAcceptances] = useState<PartyAcceptance[]>([]);
  const [scopes, setScopes] = useState<Scope[]>(["individual"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [attested, setAttested] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/documents/acceptance?locale=${locale}`, { cache: "no-store" });
    if (response.status === 401) { window.location.assign(`/${locale}/app/login?returnTo=${encodeURIComponent(`/${locale}/documents/acceptance?returnTo=${encodeURIComponent(returnTo)}`)}`); return; }
    if (response.status === 403) { window.location.assign(`/${locale}/app/mfa`); return; }
    if (!response.ok) { setError(fr ? "Impossible de vérifier les documents requis." : "Could not check required documents."); setLoaded(true); return; }
    const result = await response.json() as { requirements: Requirement[]; allowedScopes: Scope[]; partyAcceptances: PartyAcceptance[] };
    setRequirements(result.requirements); setScopes(result.allowedScopes); setPartyAcceptances(result.partyAcceptances ?? []); setLoaded(true);
    if (!result.requirements.length && !(result.partyAcceptances?.length)) window.location.assign(returnTo);
  }, [fr, locale, returnTo]);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]);

  async function accept(slug: string, subjectType: Scope, authorityAttestation = false) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/documents/acceptance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, subjectType, authorityAttestation }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? (fr ? "Impossible d’enregistrer l’acceptation." : "Could not record acceptance."));
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : (fr ? "Erreur." : "An error occurred.")); }
    finally { setBusy(false); }
  }

  const labels: Record<Scope, string> = fr ? { individual: "J’accepte pour moi", union: "Accepter pour mon syndicat", local: "Accepter pour ma section" } : { individual: "Accept for myself", union: "Accept for my union", local: "Accept for my local" };
  const partyLabels = fr ? { union: "Votre syndicat", local: "Votre section" } : { union: "Your union", local: "Your local" };
  const formattedDate = (value: string) => new Intl.DateTimeFormat(fr ? "fr-CA" : "en-CA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  return <main className="mx-auto max-w-3xl px-5 py-12"><p className="text-sm font-semibold uppercase tracking-wide text-opseu-blue">UnionOps · {fr ? "Documents requis" : "Required documents"}</p><h1 className="mt-3 text-3xl font-bold text-opseu-dark">{fr ? "Examinez les publications requises" : "Review required publications"}</h1><p className="mt-3 text-gray-600">{fr ? "Une nouvelle version exige votre acceptation avant de continuer vers les fonctions protégées. Ouvrez chaque document pour le lire." : "A newly published version requires acceptance before you continue to protected features. Open each document to read it."}</p>{error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}{!loaded ? <p className="mt-8 text-gray-600">{fr ? "Vérification…" : "Checking…"}</p> : <>{partyAcceptances.length > 0 && <section className="mt-8 rounded-xl border border-gray-200 bg-slate-50 p-5" aria-labelledby="current-dpa-status"><h2 id="current-dpa-status" className="text-lg font-semibold">{fr ? "État de l’entente de traitement des données en vigueur" : "Current data processing agreement status"}</h2><ul className="mt-3 space-y-2">{partyAcceptances.map((item) => <li key={`${item.scope}:${item.versionId}`} className="text-sm"><span className="font-medium">{partyLabels[item.scope]} · {item.title}:</span>{" "}{item.acceptedAt ? (fr ? `Acceptée le ${formattedDate(item.acceptedAt)}` : `Accepted ${formattedDate(item.acceptedAt)}`) : (fr ? "Aucune acceptation enregistrée pour la version en vigueur." : "No acceptance is recorded for the current version.")}</li>)}</ul></section>}{requirements.length > 0 ? <ul className="mt-8 space-y-4">{requirements.map((item) => { const itemScopes = item.acceptanceScope === "individual" ? scopes.filter((scope) => scope === "individual") : scopes.filter((scope) => scope === "union" || scope === "local"); return <li key={item.versionId} className="rounded-xl border border-gray-200 bg-white p-5"><h2 className="text-lg font-semibold">{item.title}</h2><a className="mt-2 inline-block text-sm text-opseu-blue underline" href={`/${locale}/documents/${item.slug}`} target="_blank" rel="noreferrer">{fr ? "Lire le document" : "Read the document"}</a>{item.acceptanceScope === "organization" && <label className="mt-4 flex items-start gap-2 text-sm text-gray-700"><input className="mt-1" type="checkbox" checked={Boolean(attested[item.versionId])} onChange={(event) => setAttested((current) => ({ ...current, [item.versionId]: event.target.checked }))} /><span>{fr ? "J’atteste être autorisé à accepter cette entente au nom du syndicat ou de la section indiqué(e)." : "I confirm that I am authorized to accept this agreement on behalf of the selected union or local."}</span></label>}<div className="mt-4 flex flex-wrap gap-2">{itemScopes.map((scope) => <button key={scope} disabled={busy || (item.acceptanceScope === "organization" && !attested[item.versionId])} className="rounded-lg bg-opseu-blue px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void accept(item.slug, scope, item.acceptanceScope === "organization" && Boolean(attested[item.versionId]))}>{labels[scope]}</button>)}</div>{item.acceptanceScope === "organization" && itemScopes.length === 0 && <p className="mt-3 text-sm text-amber-800">{fr ? "Une personne autorisée de votre syndicat ou section doit accepter ce document." : "An authorized representative of your union or local must accept this document."}</p>}</li>; })}</ul> : partyAcceptances.length === 0 ? <p className="mt-8 text-gray-600">{fr ? "Aucune acceptation en attente." : "No acceptance is pending."}</p> : null}</>}</main>;
}
