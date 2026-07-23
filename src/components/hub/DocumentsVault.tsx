"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useStewardReadOnly } from "@/hooks/use-steward-read-only";
import {
  canDeleteSharedContent,
  canManageQolContent,
} from "@/lib/qol/access";
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

export function DocumentsVault() {
  const t = useTranslations("documents");
  const { data: session } = useSession();
  const { readOnly } = useStewardReadOnly();
  const roles = (session?.user?.roles ?? []) as UserRole[];
  const canWrite = canManageQolContent(roles) && !readOnly;
  const userId = session?.user?.id ?? "";

  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/documents");
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
      const contentBase64 = await fileToBase64(file);
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category: category || undefined,
          description: description || undefined,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          contentBase64,
        }),
      });
      if (res.ok) {
        setTitle("");
        setCategory("");
        setDescription("");
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
      setMessage(t("deleted"));
      await load();
    } else {
      setError(t("deleteError"));
    }
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

      {loading ? (
        <p className="text-sm text-gray-500">{t("loading")}</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-gray-500">{t("empty")}</p>
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
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="inline-flex items-center rounded-md bg-opseu-blue px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                      >
                        {t("download")}
                      </a>
                      {canDelete && !readOnly ? (
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
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
