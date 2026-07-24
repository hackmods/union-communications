"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  TERM_EXPIRING_SOON_DAYS,
  isTermExpiringSoon,
} from "@/lib/officers/term";
import type { OfficerRosterEntry } from "@/types/officer-roster";

type FormState = {
  name: string;
  role: string;
  termStart: string;
  termEnd: string;
  email: string;
  phone: string;
  committees: string;
};

const emptyForm = (): FormState => ({
  name: "",
  role: "",
  termStart: new Date().toISOString().slice(0, 10),
  termEnd: "",
  email: "",
  phone: "",
  committees: "",
});

function parseCommittees(raw: string): string[] | undefined {
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

export function OfficerRosterBoard() {
  const t = useTranslations("officers");
  const [officers, setOfficers] = useState<OfficerRosterEntry[]>([]);
  const [expiringSoon, setExpiringSoon] = useState<OfficerRosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  async function refresh() {
    const res = await fetch("/api/officers");
    if (!res.ok) {
      setError(t("loadError"));
      return;
    }
    const data = (await res.json()) as {
      officers: OfficerRosterEntry[];
      expiringSoon: OfficerRosterEntry[];
    };
    setOfficers(data.officers);
    setExpiringSoon(data.expiringSoon);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/officers");
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as {
          officers: OfficerRosterEntry[];
          expiringSoon: OfficerRosterEntry[];
        };
        if (!cancelled) {
          setOfficers(data.officers);
          setExpiringSoon(data.expiringSoon);
        }
      } catch {
        if (!cancelled) setError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(entry: OfficerRosterEntry) {
    setEditingId(entry.id);
    setForm({
      name: entry.name,
      role: entry.role,
      termStart: entry.termStart.slice(0, 10),
      termEnd: entry.termEnd?.slice(0, 10) ?? "",
      email: entry.email ?? "",
      phone: entry.phone ?? "",
      committees: entry.committees?.join(", ") ?? "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      role: form.role.trim(),
      termStart: form.termStart,
    };
    if (form.termEnd.trim()) body.termEnd = form.termEnd.trim();
    else if (editingId) body.termEnd = null;
    if (form.email.trim()) body.email = form.email.trim();
    else if (editingId) body.email = null;
    if (form.phone.trim()) body.phone = form.phone.trim();
    else if (editingId) body.phone = null;
    const committees = parseCommittees(form.committees);
    if (committees) body.committees = committees;
    else if (editingId) body.committees = null;

    const res = await fetch(
      editingId ? `/api/officers/${editingId}` : "/api/officers",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (res.ok) {
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
      setMessage(editingId ? t("updated") : t("created"));
      await refresh();
    } else {
      setError(editingId ? t("updateError") : t("createError"));
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    const res = await fetch(`/api/officers/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage(t("deleted"));
      await refresh();
    } else {
      setError(t("deleteError"));
    }
  }

  return (
    <PageShell size="wide" className="py-6 md:py-8">
      <h1 className="text-2xl font-semibold text-opseu-dark">{t("title")}</h1>
      <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>

      {expiringSoon.length > 0 && (
        <div
          className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
          aria-live="polite"
        >
          <p className="font-medium">
            {t("termExpiringBanner", {
              count: expiringSoon.length,
              days: TERM_EXPIRING_SOON_DAYS,
            })}
          </p>
          <p className="mt-1 text-amber-900/90">
            {t("termExpiringHint")}{" "}
            <Link href="/app/handoff" className="underline hover:no-underline">
              {t("handoffLink")}
            </Link>
          </p>
          <ul className="mt-2 list-inside list-disc">
            {expiringSoon.map((o) => (
              <li key={o.id}>
                {t("termExpiringItem", {
                  name: o.name,
                  role: o.role,
                  date: o.termEnd?.slice(0, 10) ?? "",
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingId(null);
            } else {
              openCreate();
            }
          }}
        >
          {showForm ? t("cancel") : t("newOfficer")}
        </Button>
      </div>

      {message && (
        <p className="mt-3 text-sm text-green-800" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mt-4 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colName")}
            </span>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colRole")}
            </span>
            <Input
              required
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colTermStart")}
            </span>
            <Input
              type="date"
              required
              value={form.termStart}
              onChange={(e) =>
                setForm((f) => ({ ...f, termStart: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colTermEnd")}
            </span>
            <Input
              type="date"
              value={form.termEnd}
              onChange={(e) =>
                setForm((f) => ({ ...f, termEnd: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colEmail")}
            </span>
            <Input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colPhone")}
            </span>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colCommittees")}
            </span>
            <Input
              value={form.committees}
              onChange={(e) =>
                setForm((f) => ({ ...f, committees: e.target.value }))
              }
              placeholder={t("committeesPlaceholder")}
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">
              {editingId ? t("saveEdit") : t("save")}
            </Button>
          </div>
        </form>
      )}

      {loading && (
        <div
          className="mt-6 space-y-3"
          role="status"
          aria-busy="true"
          aria-label={t("loading")}
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4 max-w-full" />
        </div>
      )}

      {!loading && !error && officers.length === 0 && (
        <EmptyState className="mt-6" title={t("empty")} />
      )}

      {officers.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 font-medium">{t("colName")}</th>
                <th className="px-3 py-2 font-medium">{t("colRole")}</th>
                <th className="px-3 py-2 font-medium">{t("colTermStart")}</th>
                <th className="px-3 py-2 font-medium">{t("colTermEnd")}</th>
                <th className="px-3 py-2 font-medium">{t("colCommittees")}</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">{t("actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {officers.map((row) => {
                const expiring = isTermExpiringSoon(row.termEnd);
                return (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-opseu-dark">
                      {row.name}
                      {expiring && (
                        <span className="ml-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">
                          {t("expiringBadge")}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{row.role}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {row.termStart.slice(0, 10)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {row.termEnd?.slice(0, 10) ?? t("openEnded")}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {row.committees?.join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(row)}
                      >
                        {t("edit")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(row.id)}
                      >
                        {t("delete")}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
