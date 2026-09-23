"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Input";
import { Link } from "@/i18n/navigation";
import {
  UNION_LOCAL_SELECT_OTHER,
  UnionLocalSelect,
  emptyUnionLocalSelectValue,
  type LocalOption,
  type SubGroupOption,
  type UnionLocalSelectValue,
  type UnionOption,
} from "@/components/tenant/UnionLocalSelect";

type Row = {
  id: string;
  kind: string;
  name: string;
  email: string;
  unionName: string;
  localName: string;
  role?: string;
  offerings: string[];
  message?: string;
  status: string;
  privateNote?: string;
  createdAt: string;
  unionId?: string;
  localId?: string;
};

const statuses = [
  "new",
  "reviewing",
  "approved",
  "invited",
  "completed",
  "declined",
];

export function AccessRequestsInbox() {
  const t = useTranslations("hub.platformOperator");
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const r = await fetch(
      `/api/site-admin/access-requests${status ? `?status=${status}` : ""}`,
    );
    if (!r.ok) {
      setError(t("accessRequestsLoadFailed"));
      return;
    }
    setRows((await r.json()).items);
  }

  useEffect(() => {
    void load();
  }, [status]);

  async function save(row: Row) {
    const r = await fetch(`/api/site-admin/access-requests/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: row.status,
        unionId: row.unionId || null,
        localId: row.localId || null,
        privateNote: row.privateNote || null,
      }),
    });
    if (!r.ok) setError(t("accessRequestsSaveFailed"));
    else await load();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-opseu-dark">
          {t("accessRequestsTitle")}
        </h1>
        <p className="mt-2 text-gray-700">{t("accessRequestsBody")}</p>
      </header>
      <Select
        label={t("accessRequestsFilter")}
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">{t("accessRequestsAll")}</option>
        {statuses.map((s) => (
          <option key={s} value={s}>
            {t(`accessRequestStatus.${s}`)}
          </option>
        ))}
      </Select>
      {error ? (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      ) : null}
      <ul className="space-y-4">
        {rows.map((row) => (
          <li key={row.id}>
            <RequestCard row={row} onSave={save} />
          </li>
        ))}
      </ul>
      {!rows.length ? (
        <p className="text-gray-600">{t("accessRequestsEmpty")}</p>
      ) : null}
    </div>
  );
}

function RequestCard({
  row,
  onSave,
}: {
  row: Row;
  onSave: (r: Row) => Promise<void>;
}) {
  const t = useTranslations("hub.platformOperator");
  const [draft, setDraft] = useState(row);
  const [unions, setUnions] = useState<UnionOption[]>([]);
  const [locals, setLocals] = useState<LocalOption[]>([]);
  const [subGroups, setSubGroups] = useState<SubGroupOption[]>([]);
  const [scope, setScope] = useState<UnionLocalSelectValue>(() => ({
    ...emptyUnionLocalSelectValue(),
    unionId: row.unionId ?? "",
    localId: row.localId ?? "",
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOptions() {
    const res = await fetch("/api/site-admin/tenant-options");
    if (!res.ok) return;
    const data = (await res.json()) as {
      unions: UnionOption[];
      locals: LocalOption[];
      subGroups: SubGroupOption[];
    };
    setUnions(data.unions);
    setLocals(data.locals);
    setSubGroups(data.subGroups);
  }

  useEffect(() => {
    void loadOptions();
  }, []);

  function applyScope(next: UnionLocalSelectValue) {
    setScope(next);
    if (next.unionId === UNION_LOCAL_SELECT_OTHER) {
      setDraft((d) => ({
        ...d,
        unionId: undefined,
        localId: next.localId || undefined,
      }));
      return;
    }
    setDraft((d) => ({
      ...d,
      unionId: next.unionId || undefined,
      localId: next.localId || undefined,
    }));
  }

  async function saveReview() {
    setBusy(true);
    setError(null);
    try {
      let unionId = draft.unionId;
      let localId = draft.localId;

      if (scope.unionId === UNION_LOCAL_SELECT_OTHER) {
        const name = scope.newUnionName.trim();
        if (!name) {
          setError(t("accessRequestsUnionRequired"));
          return;
        }
        const createRes = await fetch("/api/site-admin/unions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            ...(scope.localNumber.trim()
              ? {
                  localNumber: scope.localNumber.trim(),
                  localSubText: scope.localSubText.trim() || undefined,
                }
              : {}),
          }),
        });
        const created = (await createRes.json().catch(() => ({}))) as {
          error?: string;
          union?: { id: string };
          local?: { id: string } | null;
        };
        if (!createRes.ok || !created.union) {
          setError(created.error ?? t("accessRequestsSaveFailed"));
          return;
        }
        unionId = created.union.id;
        localId = created.local?.id ?? localId;
        await loadOptions();
      } else if (scope.localNumber.trim() && unionId && !localId) {
        const localRes = await fetch("/api/site-admin/locals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unionId,
            localNumber: scope.localNumber.trim(),
            localSubText: scope.localSubText.trim() || undefined,
          }),
        });
        const localData = (await localRes.json().catch(() => ({}))) as {
          error?: string;
          local?: { id: string };
        };
        if (!localRes.ok || !localData.local) {
          setError(localData.error ?? t("accessRequestsSaveFailed"));
          return;
        }
        localId = localData.local.id;
        await loadOptions();
      }

      const next = { ...draft, unionId, localId };
      setDraft(next);
      setScope((s) => ({
        ...s,
        unionId: unionId ?? "",
        localId: localId ?? "",
        newUnionName: "",
        localNumber: "",
      }));
      await onSave(next);
    } catch {
      setError(t("accessRequestsSaveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card density="compact">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="font-semibold text-opseu-dark">
            {draft.name} · {draft.kind}
          </p>
          <p className="text-sm text-gray-700">
            {draft.email} · {draft.unionName} · {draft.localName}
          </p>
          <p className="mt-2 text-sm text-gray-700">
            {draft.message || t("accessRequestsNoMessage")}
          </p>
        </div>
        <span className="text-sm text-gray-600">
          {new Date(draft.createdAt).toLocaleString()}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        <Select
          label={t("accessRequestsStatus")}
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {t(`accessRequestStatus.${s}`)}
            </option>
          ))}
        </Select>
        <UnionLocalSelect
          mode="platform"
          unions={unions}
          locals={locals}
          subGroups={subGroups}
          value={scope}
          onChange={applyScope}
          allowCreateLocal
          disabled={busy}
        />
        <Textarea
          label={t("accessRequestsNote")}
          rows={3}
          value={draft.privateNote || ""}
          onChange={(e) =>
            setDraft({ ...draft, privateNote: e.target.value })
          }
        />
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button disabled={busy} onClick={() => void saveReview()}>
          {busy ? t("accessRequestsSaving") : t("accessRequestsSave")}
        </Button>
        <Link
          href={`/app/invites?requestId=${draft.id}`}
          className="text-sm font-semibold text-opseu-blue underline"
        >
          {t("accessRequestsOpenInvites")}
        </Link>
      </div>
    </Card>
  );
}
