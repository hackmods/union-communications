"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useLocale } from "next-intl";

type Row = { id: string; slug: string; status: string; currentVersion: number; publishAt: string | null; brandPresetId: string | null; hostWidePolicy: boolean; payload: { title?: { en?: string; fr?: string }; redistributionPermission?: string } | null; registeredSurface: string[] };
type VersionRow = { version: number; createdById: string; createdAt: string; payload: { sha256?: string; sizeBytes?: number; fileName?: string; scanStatus?: string } };
const emptyPayload = {
  kind: "external", title: { en: "", fr: "" }, summary: { en: "", fr: "" }, purpose: { en: "", fr: "" }, audience: { en: "", fr: "" },
  format: "External resource", language: "en-fr", owner: "", source: "", externalUrl: "", unionBrand: "", relatedGuide: "", effectiveAt: "", requiresAcceptance: false,
  content: { en: "", fr: "" }, redistributionPermission: "",
  linkedSurfaces: [] as string[],
  required: false,
};

export function PublicDocumentsAdmin() {
  const locale = useLocale();
  const fr = locale === "fr";
  const [rows, setRows] = useState<Row[]>([]);
  const [slug, setSlug] = useState("");
  const [payload, setPayload] = useState(emptyPayload);
  const [status, setStatus] = useState("draft");
  const [brandPresetId, setBrandPresetId] = useState("");
  const [hostWidePolicy, setHostWidePolicy] = useState(false);
  const [humanApproval, setHumanApproval] = useState(false);
  const [publishAt, setPublishAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, VersionRow[]>>({});
  const [recoveryId, setRecoveryId] = useState("");
  const [recoveryReason, setRecoveryReason] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const label = (en: string, french: string) => fr ? french : en;

  async function refresh() {
    const response = await fetch("/api/site-admin/documents", { cache: "no-store" });
    if (response.ok) setRows((await response.json() as { documents: Row[] }).documents);
  }
  useEffect(() => { void refresh(); }, []);

  function setField<K extends keyof typeof payload>(name: K, value: typeof payload[K]) {
    setPayload((current) => ({ ...current, [name]: value }));
  }
  function setBilingual(name: "title" | "summary" | "purpose" | "audience" | "content", language: "en" | "fr", value: string) {
    setPayload((current) => {
      if (name === "title") return { ...current, title: { ...current.title, [language]: value } };
      if (name === "summary") return { ...current, summary: { ...current.summary, [language]: value } };
      if (name === "purpose") return { ...current, purpose: { ...current.purpose, [language]: value } };
      if (name === "audience") return { ...current, audience: { ...current.audience, [language]: value } };
      return { ...current, content: { ...current.content, [language]: value } };
    });
  }

  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const metadata = { slug, payload, status, brandPresetId: brandPresetId || undefined, hostWidePolicy, humanApproval, publishAt: publishAt ? new Date(publishAt).toISOString() : undefined };
      let response: Response;
      if (payload.kind === "file" || editId) {
        const form = new FormData(); form.set("metadata", JSON.stringify(metadata)); if (file) form.set("file", file, file.name);
        response = await fetch(editId ? `/api/site-admin/documents/${editId}/versions` : "/api/site-admin/documents", { method: "POST", body: form });
      } else response = await fetch("/api/site-admin/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(metadata) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? label("Save failed", "Échec de l’enregistrement"));
      setNotice(label("Document saved", "Document enregistré")); setSlug(""); setPayload(emptyPayload); setFile(null); setEditId(null); await refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : label("Save failed", "Échec de l’enregistrement")); }
    finally { setBusy(false); }
  }

  async function action(id: string, action: "publish" | "archive" | "restore") {
    const response = await fetch(`/api/site-admin/documents/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setNotice(result.error ?? label("Action failed", "Échec de l’action")); else { setNotice(label("Publication state updated", "État de publication mis à jour")); await refresh(); }
  }

  function startVersion(row: Row) {
    if (!row.payload) return;
    const p = row.payload as typeof emptyPayload;
    setEditId(row.id); setSlug(row.slug); setStatus("draft"); setBrandPresetId(row.brandPresetId ?? ""); setHostWidePolicy(row.hostWidePolicy);
    setPayload({ ...emptyPayload, ...p, title: { ...emptyPayload.title, ...p.title }, summary: { ...emptyPayload.summary, ...p.summary }, purpose: { ...emptyPayload.purpose, ...p.purpose }, audience: { ...emptyPayload.audience, ...p.audience }, content: { ...emptyPayload.content, ...p.content } });
    setHumanApproval(Boolean((row.payload as typeof emptyPayload & { humanApproved?: boolean }).humanApproved)); setFile(null); setNotice(label(`Preparing version ${row.currentVersion + 1} for ${row.slug}`, `Préparation de la version ${row.currentVersion + 1} de ${row.slug}`));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function showHistory(id: string) {
    const response = await fetch(`/api/site-admin/documents/${id}/versions`, { cache: "no-store" });
    if (!response.ok) { setNotice(label("Could not load version history", "Impossible de charger l’historique")); return; }
    const result = await response.json() as { versions: VersionRow[] };
    setHistory((current) => ({ ...current, [id]: result.versions }));
  }

  async function recoverExactDocument(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/site-admin/documents/recovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: recoveryId, reason: recoveryReason }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? label("Recovery failed", "Échec de la récupération"));
      setNotice(label("Exact document restored; content was not opened by this operator action.", "Document exact restauré; le contenu n’a pas été ouvert par cette action administrative.")); setRecoveryId(""); setRecoveryReason(""); await refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : label("Recovery failed", "Échec de la récupération")); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
    <header><h1 className="text-3xl font-bold text-opseu-dark">{label("Public Document Library", "Bibliothèque publique de documents")}</h1><p className="mt-2 max-w-3xl text-sm text-gray-600">{label("Platform administrator only. Published file bytes require documented redistribution rights. New legal text requires human approval. Brand variants never affect Hub access.", "Réservé à l’administration de la plateforme. Les droits de redistribution doivent être consignés pour les fichiers publiés. Les nouveaux textes juridiques exigent une approbation humaine. Les variantes de marque ne donnent aucun accès au Hub.")}</p></header>
    {notice && <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm">{notice}</p>}
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5"><h2 className="text-lg font-semibold">{label("Exact-document recovery", "Récupération d’un document précis")}</h2><p className="mt-1 text-sm text-gray-700">{label("Restores one archived document by exact ID. This action does not grant access to its private contents.", "Restaure un document archivé à partir de son identifiant exact. Cette action ne donne pas accès à son contenu privé.")}</p><form className="mt-3 grid gap-3" onSubmit={recoverExactDocument}><Field label={label("Exact document ID", "Identifiant exact du document")}><input required value={recoveryId} onChange={(e) => setRecoveryId(e.target.value)} /></Field><Field label={label("Reason (20–2,000 characters)", "Motif (20 à 2 000 caractères)")}><textarea required minLength={20} maxLength={2000} rows={3} value={recoveryReason} onChange={(e) => setRecoveryReason(e.target.value)} /></Field><div><button disabled={busy} className="rounded border border-amber-700 px-4 py-2 text-sm font-semibold disabled:opacity-50">{label("Restore exact record", "Restaurer la fiche exacte")}</button></div></form></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="text-xl font-semibold">{editId ? label("Create a replacement version", "Créer une nouvelle version") : label("Create a library record", "Créer une fiche de bibliothèque")}</h2>
      <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={create}>
        <Field label="Slug"><input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} readOnly={Boolean(editId)} onChange={(event) => setSlug(event.target.value)} /></Field>
        <Field label={label("Record type", "Type de fiche")}><select value={payload.kind} onChange={(event) => { const kind = event.target.value as typeof payload.kind; setPayload((current) => ({ ...current, kind, format: kind === "policy" ? "Web page" : kind === "file" ? "PDF" : "External resource" })); }}><option value="policy">{label("Policy text", "Texte de politique")}</option><option value="file">{label("Hosted file", "Fichier hébergé")}</option><option value="external">{label("External source", "Source externe")}</option></select></Field>
        <Field label={label("English title", "Titre anglais")}><input required value={payload.title.en} onChange={(e) => setBilingual("title", "en", e.target.value)} /></Field>
        <Field label={label("French title", "Titre français")}><input required value={payload.title.fr} onChange={(e) => setBilingual("title", "fr", e.target.value)} /></Field>
        {(["summary", "purpose", "audience"] as const).flatMap((name) => (["en", "fr"] as const).map((language) => <Field key={`${name}-${language}`} label={`${label(name[0].toUpperCase() + name.slice(1), name === "summary" ? "Résumé" : name === "purpose" ? "Objectif" : "Public visé")} · ${language.toUpperCase()}`}><input required value={payload[name][language]} onChange={(e) => setBilingual(name, language, e.target.value)} /></Field>))}
        <Field label={label("Format", "Format")}><input required value={payload.format} onChange={(e) => setField("format", e.target.value)} /></Field>
        <Field label={label("Language", "Langue")}><select value={payload.language} onChange={(e) => setField("language", e.target.value as typeof payload.language)}><option value="en">EN</option><option value="fr">FR</option><option value="en-fr">EN / FR</option></select></Field>
        <Field label={label("Owner", "Responsable")}><input required value={payload.owner} onChange={(e) => setField("owner", e.target.value)} /></Field>
        <Field label={label("Source / provenance", "Source / provenance")}><input required value={payload.source} onChange={(e) => setField("source", e.target.value)} /></Field>
        {payload.kind === "external" && <Field label="HTTPS URL"><input required type="url" value={payload.externalUrl} onChange={(e) => setField("externalUrl", e.target.value)} /></Field>}
        {payload.kind === "file" && <><Field label={label("File (10 MB max)", "Fichier (10 Mo max)")}><input required type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,.doc,.docx,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field><Field label={label("Redistribution rights record", "Preuve des droits de redistribution")}><input required value={payload.redistributionPermission} onChange={(e) => setField("redistributionPermission", e.target.value)} placeholder={label("Owned or license/source reference", "Propriété ou référence de licence/source")} /></Field></>}
        {payload.kind === "policy" && <><Field label={label("Approved English policy text", "Texte de politique approuvé en anglais")}><textarea required={status !== "draft"} rows={6} value={payload.content.en} onChange={(e) => setBilingual("content", "en", e.target.value)} /></Field><Field label={label("Approved French policy text", "Texte de politique approuvé en français")}><textarea required={status !== "draft"} rows={6} value={payload.content.fr} onChange={(e) => setBilingual("content", "fr", e.target.value)} /></Field><label className="flex gap-2 text-sm"><input type="checkbox" checked={humanApproval} onChange={(e) => setHumanApproval(e.target.checked)} required={status !== "draft"} />{label("I confirm both language versions have human approval", "Je confirme que les deux versions linguistiques ont été approuvées par une personne")}</label></>}
        <Field label={label("Brand Kit preset ID (leave blank for neutral)", "ID du préréglage Brand Kit (laisser vide pour neutre)")}><input value={brandPresetId} onChange={(e) => setBrandPresetId(e.target.value)} /></Field>
        <Field label={label("Union brand label", "Nom de marque syndicale")}><input value={payload.unionBrand} onChange={(e) => setField("unionBrand", e.target.value)} /></Field>
        <Field label={label("Effective date (optional)", "Date d’entrée en vigueur (facultative)")}><input type="date" value={payload.effectiveAt} onChange={(e) => setField("effectiveAt", e.target.value)} /></Field>
        <Field label={label("Related guide URL (optional)", "Lien vers un guide associé (facultatif)")}><input value={payload.relatedGuide} onChange={(e) => setField("relatedGuide", e.target.value)} /></Field>
        <Field label={label("Registered linking surfaces (comma separated)", "Surfaces liées enregistrées (séparées par des virgules)")}><input value={payload.linkedSurfaces.join(", ")} onChange={(e) => setField("linkedSurfaces", e.target.value.split(",").map((value) => value.trim()).filter(Boolean))} /></Field>
        <Field label={label("Publication status", "État de publication")}><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="draft">Draft</option><option value="published">Publish</option><option value="scheduled">Schedule</option></select></Field>
        <Field label={label("Publication time", "Date de publication")}><input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} /></Field>
        {payload.kind === "policy" && <label className="flex gap-2 text-sm"><input type="checkbox" checked={hostWidePolicy} onChange={(e) => setHostWidePolicy(e.target.checked)} />{label("Host-wide policy (no brand variant)", "Politique de l’instance (sans variante de marque)")}</label>}
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={payload.requiresAcceptance} onChange={(e) => setField("requiresAcceptance", e.target.checked)} />{label("Require acceptance of this version from affected Hub / Portal users", "Exiger l’acceptation de cette version des personnes concernées du Hub / Portail")}</label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={payload.required} onChange={(e) => setField("required", e.target.checked)} />{label("Required for launch readiness", "Requis pour l’état de préparation au lancement")}</label>
        <div className="flex gap-2 md:col-span-2"><button disabled={busy} className="rounded-lg bg-opseu-blue px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? label("Saving…", "Enregistrement…") : editId ? label("Save new version", "Enregistrer la nouvelle version") : label("Save record", "Enregistrer")}</button>{editId && <button type="button" className="rounded-lg border px-4 py-2" onClick={() => { setEditId(null); setSlug(""); setPayload(emptyPayload); setFile(null); }}>Cancel</button>}</div>
      </form>
    </section>
    <section><h2 className="text-xl font-semibold">{label("Managed records", "Fiches gérées")}</h2><ul className="mt-3 space-y-3">{rows.map((row) => <li key={row.id} className="rounded-xl border border-gray-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-semibold">{row.payload?.title?.[fr ? "fr" : "en"] ?? row.slug}</h3><p className="text-sm text-gray-600">/{row.slug} · v{row.currentVersion} · {row.status}{row.brandPresetId ? ` · ${row.brandPresetId}` : " · neutral"}{row.publishAt ? ` · ${new Date(row.publishAt).toLocaleString()}` : ""}</p>{row.registeredSurface.length > 0 && <p className="mt-1 text-xs text-gray-500">{label("Linking surfaces", "Surfaces liées")}: {row.registeredSurface.join(", ")}</p>}{row.status !== "draft" && !row.payload?.redistributionPermission && <p className="mt-1 text-xs text-amber-700">{label("No rights record is attached to this record.", "Aucune preuve de droits n’est jointe à cette fiche.")}</p>}</div><div className="flex flex-wrap gap-2"><button className="rounded border px-3 py-2 text-sm" onClick={() => startVersion(row)}>{label("New version", "Nouvelle version")}</button><button className="rounded border px-3 py-2 text-sm" onClick={() => void showHistory(row.id)}>{label("History", "Historique")}</button>{row.status !== "published" && row.status !== "scheduled" && <button className="rounded border px-3 py-2 text-sm" onClick={() => void action(row.id, "publish")}>{label("Publish", "Publier")}</button>}{row.status !== "archived" ? <button className="rounded border px-3 py-2 text-sm" onClick={() => void action(row.id, "archive")}>{label("Archive", "Archiver")}</button> : <button className="rounded border px-3 py-2 text-sm" onClick={() => void action(row.id, "restore")}>{label("Restore draft", "Restaurer le brouillon")}</button>}</div></div>{history[row.id] && <ol className="mt-4 border-t pt-3 text-xs text-gray-600">{history[row.id].map((version) => <li key={version.version} className="py-1">v{version.version} · {new Date(version.createdAt).toLocaleString()}{version.payload.fileName ? ` · ${version.payload.fileName} (${version.payload.sizeBytes} bytes; ${version.payload.scanStatus})` : ""}{version.payload.sha256 ? ` · SHA-256 ${version.payload.sha256.slice(0, 16)}…` : ""}</li>)}</ol>}</li>)}</ul></section>
  </main>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700">{label}<span className="mt-1 block">{children}</span></label>;
}
