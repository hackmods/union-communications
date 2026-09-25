"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useHubWriteScope } from "@/components/hub/useHubWriteScope";
import { readApiErrorMessage } from "@/lib/hub/parse-api-error";
import type { Committee } from "@/types/committees";

type LocalMemberOption = {
  userId: string;
  name: string;
  email: string;
  status: string;
  accountStatus: string;
  startedAt: string;
  endedAt: string | null;
};

export function CommitteesBoard() {
  const t = useTranslations("committees");
  const writeScope = useHubWriteScope();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState("");
  const [memberUserIds, setMemberUserIds] = useState<string[]>([]);
  const [memberSelectionDirty, setMemberSelectionDirty] = useState(false);
  const [localMembers, setLocalMembers] = useState<LocalMemberOption[]>([]);
  const [eligibleLocalMembers, setEligibleLocalMembers] = useState<LocalMemberOption[]>([]);
  const [memberPickerAvailable, setMemberPickerAvailable] = useState(false);

  async function refresh() {
    const res = await fetch("/api/committees");
    if (!res.ok) {
      setError(t("loadError"));
      return;
    }
    const data = (await res.json()) as { committees: Committee[] };
    setCommittees(data.committees);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/committees");
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { committees: Committee[] };
        if (!cancelled) setCommittees(data.committees);
      } catch {
        if (!cancelled) setError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    void fetch("/api/organization/memberships")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { memberships?: LocalMemberOption[] };
        const memberships = data.memberships ?? [];
        const now = Date.now();
        setLocalMembers(memberships);
        setEligibleLocalMembers(memberships.filter((membership) =>
          membership.status === "active" && membership.accountStatus === "active" &&
          !membership.endedAt && Date.parse(membership.startedAt) <= now,
        ));
        setMemberPickerAvailable(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [t]);

  function resetForm() {
    setName("");
    setDescription("");
    setMemberIds("");
    setMemberUserIds([]);
    setMemberSelectionDirty(false);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(c: Committee) {
    setEditingId(c.id);
    setName(c.name);
    setDescription(c.description ?? "");
    setMemberIds(c.memberOfficerIds.join(", "));
    setMemberUserIds(c.memberUserIds ?? []);
    setMemberSelectionDirty(false);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!writeScope.canWrite) {
      setError(writeScope.blockedMessage);
      return;
    }
    const memberOfficerIds = memberIds
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const body: {
      name: string;
      description: string | undefined;
      memberOfficerIds: string[];
      memberUserIds?: string[];
    } = {
      name: name.trim(),
      description: description.trim() || undefined,
      memberOfficerIds,
    };
    if (memberPickerAvailable && (!editingId || memberSelectionDirty)) {
      body.memberUserIds = memberUserIds;
    }

    const res = editingId
      ? await fetch(`/api/committees/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            description: description.trim() || null,
          }),
        })
      : await fetch("/api/committees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

    if (res.ok) {
      setMessage(editingId ? t("updated") : t("created"));
      resetForm();
      await refresh();
    } else {
      const raw = await readApiErrorMessage(
        res,
        editingId ? t("updateError") : t("createError"),
      );
      setError(writeScope.blockReason ?? raw);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    const res = await fetch(`/api/committees/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage(t("deleted"));
      if (editingId === id) resetForm();
      await refresh();
    } else {
      setError(t("deleteError"));
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-opseu-dark">{t("title")}</h1>
      <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>
      <p className="mt-2 text-xs text-gray-500">{t("disclaimer")}</p>
      <p className="mt-2 text-sm text-gray-600">
        {t("jointCommitteeHint")}{" "}
        <Link
          href="/guide/joint-committee"
          className="font-medium text-opseu-blue underline"
        >
          {t("jointCommitteeLink")}
        </Link>
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (showForm && !editingId) {
              resetForm();
            } else {
              setEditingId(null);
              setName("");
              setDescription("");
              setMemberIds("");
              setMemberUserIds([]);
              setMemberSelectionDirty(false);
              setShowForm(true);
            }
          }}
        >
          {showForm && !editingId ? t("cancel") : t("newCommittee")}
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
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colName")}
            </span>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colDescription")}
            </span>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {memberPickerAvailable && (
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-gray-700">
                {t("colMembers")}
              </span>
              <select
                multiple
                size={Math.min(8, Math.max(4, localMembers.length))}
                value={memberUserIds}
                onChange={(event) => {
                  setMemberUserIds(Array.from(event.currentTarget.selectedOptions, (option) => option.value));
                  setMemberSelectionDirty(true);
                }}
                aria-describedby="committee-members-help"
                className="min-h-28 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue"
              >
                {eligibleLocalMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
              <span id="committee-members-help" className="mt-1 block text-xs text-gray-500">
                {t("membersSelectHint")}
              </span>
              {eligibleLocalMembers.length === 0 && (
                <span className="mt-1 block text-xs text-gray-500">{t("noEligibleMembers")}</span>
              )}
            </label>
          )}
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-gray-700">
              {memberPickerAvailable ? t("legacyMemberIds") : t("colMembers")}
            </span>
            <Input
              value={memberIds}
              onChange={(e) => setMemberIds(e.target.value)}
              placeholder={t("membersHint")}
              aria-describedby="committee-legacy-members-help"
            />
            <span id="committee-legacy-members-help" className="mt-1 block text-xs text-gray-500">
              {memberPickerAvailable ? t("legacyMemberHint") : t("membersHint")}
            </span>
          </label>
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <Button type="submit">
              {editingId ? t("saveChanges") : t("save")}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                {t("cancel")}
              </Button>
            )}
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
        </div>
      )}

      {!loading && !error && committees.length === 0 && (
        <EmptyState className="mt-6" title={t("empty")} />
      )}

      {committees.length > 0 && (
        <ul className="mt-6 space-y-3">
          {committees.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-opseu-dark">
                    {c.name}
                  </h2>
                  {c.description && (
                    <p className="mt-1 text-sm text-gray-600">{c.description}</p>
                  )}
                  <div className="mt-2 text-xs text-gray-600">
                    {(c.memberUserIds?.length ?? 0) > 0 ? (
                      <p>
                        <span className="font-medium">{t("colMembers")}:</span>{" "}
                        {c.memberUserIds.map((userId) => {
                          const member = localMembers.find((option) => option.userId === userId);
                          if (!member) return userId;
                          const inactive = member.status !== "active" || member.accountStatus !== "active" || Boolean(member.endedAt);
                          return inactive ? `${member.name} (${t("inactiveMember")})` : member.name;
                        }).join(", ")}
                      </p>
                    ) : c.memberOfficerIds.length === 0 ? (
                      <p>{t("noMembers")}</p>
                    ) : null}
                    {c.memberOfficerIds.length > 0 && (
                      <p className={(c.memberUserIds?.length ?? 0) > 0 ? "mt-1" : ""}>
                        <span className="font-medium">{t("legacyMemberIds")}:</span>{" "}
                        {c.memberOfficerIds.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(c)}
                  >
                    {t("edit")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(c.id)}
                  >
                    {t("delete")}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
