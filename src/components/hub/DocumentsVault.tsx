"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStewardReadOnly } from "@/hooks/use-steward-read-only";
import { canDeleteSharedContent } from "@/lib/qol/access";
import type { DocumentRecord } from "@/types/attachments";
import type { UserRole } from "@/types/tenant";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function DocumentsVault() {
  const t = useTranslations("documents");
  const { data: session } = useSession();
  const { readOnly } = useStewardReadOnly();
  const roles = (session?.user?.roles ?? []) as UserRole[];
  const canWrite = roles.some((role) => ["local_president", "local_steward", "local_exec"].includes(role)) && !readOnly;
  const userId = session?.user?.id ?? "";

  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"local_shared" | "restricted">("local_shared");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [versionHistory, setVersionHistory] = useState<Record<string, Array<{ version: number; fileName: string; sizeBytes: number; sha256?: string; createdAt: string }>>>({});
  const [grantValues, setGrantValues] = useState<Record<string, string>>({});
  const [grantEditor, setGrantEditor] = useState<string | null>(null);
  const [metadataEditor, setMetadataEditor] = useState<string | null>(null);
  const [metadataValues, setMetadataValues] = useState<Record<string, { title: string; category: string; description: string; visibility: "local_shared" | "restricted"; legalHold: boolean; retentionUntil: string }>>({});

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/documents${showArchived ? "?archived=1" : ""}`);
    if (res.ok) {
      const data = await res.json();
      setDocs(data.documents);
    }
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/documents")
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setDocs(data.documents);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function toggleArchived() {
    const next = !showArchived;
    setShowArchived(next);
    setLoading(true);
    const res = await fetch(`/api/documents${next ? "?archived=1" : ""}`);
    if (res.ok) setDocs(((await res.json()) as { documents: DocumentRecord[] }).documents);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !file) return;
    setError(null);
    setMessage(null);
    setUploading(true);
    try {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(t("unsupportedType"));
        return;
      }
      const form = new FormData();
      form.set("title", title);
      form.set("category", category);
      form.set("description", description);
      form.set("visibility", visibility);
      form.set("file", file, file.name);
      const res = await fetch("/api/documents", {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        setTitle("");
        setCategory("");
        setDescription("");
        setVisibility("local_shared");
        setFile(null);
        setShowForm(false);
        setMessage(t("created"));
        await load();
      } else {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? t("createError"));
      }
    } catch {
      setError(t("createError"));
    } finally {
      setUploading(false);
    }
  }

  async function removeDoc(id: string) {
    if (readOnly) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage(t("archived"));
      await load();
    } else {
      setError(t("deleteError"));
    }
  }

  async function restoreDoc(id: string) {
    const res = await fetch(`/api/documents/${id}`, { method: "PATCH" });
    if (res.ok) {
      setMessage(t("restored"));
      await load();
    } else setError(t("restoreError"));
  }

  async function loadHistory(id: string) {
    const res = await fetch(`/api/documents/${id}/versions`);
    if (!res.ok) { setError(t("historyError")); return; }
    const data = await res.json() as { versions: Array<{ version: number; fileName: string; sizeBytes: number; sha256?: string; createdAt: string }> };
    setVersionHistory((current) => ({ ...current, [id]: data.versions }));
  }

  async function replaceFile(doc: DocumentRecord, file: File | null) {
    if (!file) return;
    const form = new FormData();
    form.set("file", file, file.name);
    form.set("title", doc.title);
    form.set("category", doc.category ?? "");
    form.set("description", doc.description ?? "");
    const res = await fetch(`/api/documents/${doc.id}/versions`, { method: "POST", body: form });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? t("versionError"));
      return;
    }
    setMessage(t("versionCreated"));
    await load();
    await loadHistory(doc.id);
  }

  async function editGrants(doc: DocumentRecord) {
    if (grantEditor === doc.id) { setGrantEditor(null); return; }
    const res = await fetch(`/api/documents/${doc.id}/access`);
    if (!res.ok) { setError(t("grantLoadError")); return; }
    const data = await res.json() as { userIds: string[] };
    setGrantValues((current) => ({ ...current, [doc.id]: data.userIds.join("\n") }));
    setGrantEditor(doc.id);
  }

  async function saveGrants(doc: DocumentRecord) {
    const userIds = (grantValues[doc.id] ?? "").split(/[\s,]+/).map((value) => value.trim()).filter(Boolean);
    const res = await fetch(`/api/documents/${doc.id}/access`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds }) });
    if (!res.ok) { const data = await res.json().catch(() => ({})) as { error?: string }; setError(data.error ?? t("grantSaveError")); return; }
    setGrantEditor(null);
    setMessage(t("grantsSaved"));
  }

  async function editMetadata(doc: DocumentRecord) {
    if (metadataEditor === doc.id) { setMetadataEditor(null); return; }
    setMetadataValues((current) => ({ ...current, [doc.id]: { title: doc.title, category: doc.category ?? "", description: doc.description ?? "", visibility: doc.visibility ?? "local_shared", legalHold: doc.legalHold ?? false, retentionUntil: doc.retentionUntil?.slice(0, 10) ?? "" } }));
    setMetadataEditor(doc.id);
  }

  async function saveMetadata(doc: DocumentRecord) {
    const values = metadataValues[doc.id];
    const isLeader = roles.some((role) => role === "local_president" || role === "local_exec");
    const { retentionUntil, legalHold, ...basicValues } = values;
    const metadata = isLeader ? { ...basicValues, legalHold, retentionUntil: retentionUntil ? new Date(`${retentionUntil}T23:59:59.999Z`).toISOString() : null } : basicValues;
    const res = await fetch(`/api/documents/${doc.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(metadata) });
    if (!res.ok) { const data = await res.json().catch(() => ({})) as { error?: string }; setError(data.error ?? t("metadataError")); return; }
    setMetadataEditor(null); setMessage(t("metadataSaved")); await load();
  }

  async function restoreVersion(doc: DocumentRecord, version: number) {
    const res = await fetch(`/api/documents/${doc.id}/versions`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version }) });
    if (!res.ok) { const data = await res.json().catch(() => ({})) as { error?: string }; setError(data.error ?? t("versionRestoreError")); return; }
    setMessage(t("versionRestored")); await load(); await loadHistory(doc.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-opseu-dark">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>
      </div>

      {message && (
        <p className="text-sm text-green-700" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {canWrite && (
        <div>
          {!showForm ? (
            <Button type="button" onClick={() => setShowForm(true)}>
              {t("upload")}
            </Button>
          ) : (
            <Card>
              <CardTitle>{t("uploadTitle")}</CardTitle>
              <form onSubmit={handleCreate} className="mt-4 space-y-3">
                <Input
                  label={t("fieldTitle")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <Input
                  label={t("fieldCategory")}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={t("categoryPlaceholder")}
                />
                <Textarea
                  label={t("fieldDescription")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
                <label className="block text-sm font-medium text-gray-700">{t("visibility")}
                  <select className="mt-1 block min-h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={visibility} onChange={(event) => setVisibility(event.target.value as "local_shared" | "restricted")}>
                    <option value="local_shared">{t("localShared")}</option>
                    <option value="restricted">{t("restricted")}</option>
                  </select>
                </label>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t("fieldFile")}
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    required
                    className="block w-full text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={uploading || !file}>
                    {uploading ? t("uploading") : t("save")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowForm(false)}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      )}

      <button type="button" onClick={() => void toggleArchived()} className="text-sm font-medium text-opseu-blue underline">{showArchived ? t("showCurrent") : t("showArchived")}</button>

      {loading ? (
        <p className="text-sm text-gray-500">{t("loading")}</p>
      ) : docs.length === 0 ? (
        <EmptyState
          className="mt-2"
          title={t("empty")}
          action={
            canWrite ? (
              <Button size="sm" onClick={() => setShowForm(true)}>
                {t("upload")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {docs.map((doc) => {
            const canDelete = canDeleteSharedContent(
              roles,
              doc.uploadedById,
              userId,
            );
            return (
              <li key={doc.id}>
                <Card>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle>{doc.title}</CardTitle>
                      <p className="mt-1 text-sm text-gray-600">
                        {doc.fileName}
                        {doc.category ? ` · ${doc.category}` : ""}
                        {` · ${t("scanStatus", { status: doc.scanStatus })}`}
                      </p>
                      {doc.description ? (
                        <p className="mt-2 text-sm text-gray-700">
                          {doc.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-gray-500">{t(doc.visibility === "restricted" ? "restricted" : "localShared")}{doc.currentVersion ? ` · v${doc.currentVersion}` : ""}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!doc.archivedAt ? <a
                        href={`/api/documents/${doc.id}/download`}
                        className="inline-flex items-center rounded-md bg-opseu-blue px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                      >
                        {t("download")}
                      </a> : <span className="rounded-md bg-slate-100 px-3 py-1.5 text-sm text-gray-600">{t("archivedLabel")}</span>}
                      {doc.archivedAt && canDelete && !readOnly ? <Button type="button" variant="secondary" onClick={() => void restoreDoc(doc.id)}>{t("restore")}</Button> : null}
                      {!doc.archivedAt && canDelete && !readOnly ? <label className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50">{t("replaceFile")}<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" className="sr-only" onChange={(event) => { void replaceFile(doc, event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} /></label> : null}
                      {!doc.archivedAt && canDelete && !readOnly ? <Button type="button" variant="secondary" onClick={() => void editMetadata(doc)}>{t("editMetadata")}</Button> : null}
                      {!doc.archivedAt && doc.visibility === "restricted" && canDelete && !readOnly ? <Button type="button" variant="secondary" onClick={() => void editGrants(doc)}>{t("manageAccess")}</Button> : null}
                      <Button type="button" variant="secondary" onClick={() => void loadHistory(doc.id)}>{t("history")}</Button>
                      {!doc.archivedAt && canDelete && !readOnly ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => void removeDoc(doc.id)}
                        >
                          {t("delete")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {grantEditor === doc.id ? <div className="mt-4 space-y-2 border-t border-gray-100 pt-3"><Textarea label={t("granteeIds")} value={grantValues[doc.id] ?? ""} onChange={(event) => setGrantValues((current) => ({ ...current, [doc.id]: event.target.value }))} rows={3} /><p className="text-xs text-gray-500">{t("granteeHelp")}</p><div className="flex gap-2"><Button type="button" onClick={() => void saveGrants(doc)}>{t("saveAccess")}</Button><Button type="button" variant="secondary" onClick={() => setGrantEditor(null)}>{t("cancel")}</Button></div></div> : null}
                  {metadataEditor === doc.id ? <div className="mt-4 space-y-2 border-t border-gray-100 pt-3"><Input label={t("fieldTitle")} value={metadataValues[doc.id]?.title ?? ""} onChange={(event) => setMetadataValues((current) => ({ ...current, [doc.id]: { ...current[doc.id], title: event.target.value } }))} /><Input label={t("fieldCategory")} value={metadataValues[doc.id]?.category ?? ""} onChange={(event) => setMetadataValues((current) => ({ ...current, [doc.id]: { ...current[doc.id], category: event.target.value } }))} /><Textarea label={t("fieldDescription")} rows={2} value={metadataValues[doc.id]?.description ?? ""} onChange={(event) => setMetadataValues((current) => ({ ...current, [doc.id]: { ...current[doc.id], description: event.target.value } }))} /><label className="block text-sm">{t("visibility")}<select className="mt-1 block min-h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={metadataValues[doc.id]?.visibility ?? "local_shared"} onChange={(event) => setMetadataValues((current) => ({ ...current, [doc.id]: { ...current[doc.id], visibility: event.target.value as "local_shared" | "restricted" } }))}><option value="local_shared">{t("localShared")}</option><option value="restricted">{t("restricted")}</option></select></label>{roles.some((role) => role === "local_president" || role === "local_exec") ? <><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={metadataValues[doc.id]?.legalHold ?? false} onChange={(event) => setMetadataValues((current) => ({ ...current, [doc.id]: { ...current[doc.id], legalHold: event.target.checked } }))} />{t("legalHold")}</label><Input type="date" label={t("retentionUntil")} value={metadataValues[doc.id]?.retentionUntil ?? ""} onChange={(event) => setMetadataValues((current) => ({ ...current, [doc.id]: { ...current[doc.id], retentionUntil: event.target.value } }))} /></> : null}<div className="flex gap-2"><Button type="button" onClick={() => void saveMetadata(doc)}>{t("save")}</Button><Button type="button" variant="secondary" onClick={() => setMetadataEditor(null)}>{t("cancel")}</Button></div></div> : null}
                  {versionHistory[doc.id] ? <ol className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-600">{versionHistory[doc.id].map((version) => <li key={version.version} className="flex flex-wrap items-center gap-2 py-1">v{version.version} · {version.fileName} · {Math.ceil(version.sizeBytes / 1024)} KB · {new Date(version.createdAt).toLocaleDateString()} {version.sha256 ? `· SHA-256 ${version.sha256.slice(0, 12)}…` : "· legacy hash pending"}{!doc.archivedAt && version.version !== (doc.currentVersion ?? 1) && canDelete && !readOnly ? <Button type="button" size="sm" variant="secondary" onClick={() => void restoreVersion(doc, version.version)}>{t("restoreVersion")}</Button> : null}</li>)}</ol> : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
