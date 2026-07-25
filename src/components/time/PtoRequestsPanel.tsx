"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { PtoBalance, PtoRequest, PtoType } from "@/types/time";

const PTO_TYPES: PtoType[] = ["vacation", "sick", "personal", "other"];

function toIsoLocal(value: string): string {
  return new Date(value).toISOString();
}

export function PtoRequestsPanel({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("time");
  const { data: session } = useSession();
  const [requests, setRequests] = useState<PtoRequest[]>([]);
  const [balances, setBalances] = useState<PtoBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [ptoType, setPtoType] = useState<PtoType>("vacation");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  const [balanceHours, setBalanceHours] = useState("40");
  const [balanceType, setBalanceType] = useState<PtoType>("vacation");
  const [balanceWorkerId, setBalanceWorkerId] = useState("");

  const reload = useCallback(async () => {
    const [ptoRes, balRes] = await Promise.all([
      fetch("/api/time/pto"),
      fetch("/api/time/pto/balances"),
    ]);
    if (!ptoRes.ok) {
      setError(t("ptoLoadError"));
      return;
    }
    const data = (await ptoRes.json()) as { requests: PtoRequest[] };
    setRequests(data.requests);
    if (balRes.ok) {
      const bal = (await balRes.json()) as { balances: PtoBalance[] };
      setBalances(bal.balances);
    }
    setError(null);
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function handleCreate() {
    if (!start || !end) {
      setError(t("ptoValidationError"));
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/time/pto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ptoType,
          startsAt: toIsoLocal(start),
          endsAt: toIsoLocal(end),
          hoursRequested: hours ? Number(hours) : undefined,
          notes: notes.trim() || undefined,
          status: "submitted",
          workerId: session?.user?.id,
          workerName: session?.user?.name ?? session?.user?.email,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? t("ptoCreateError"));
        return;
      }
      setStart("");
      setEnd("");
      setHours("");
      setNotes("");
      await reload();
    } finally {
      setWorking(false);
    }
  }

  async function patchStatus(
    id: string,
    status: "approved" | "rejected" | "cancelled",
  ) {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(`/api/time/pto/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setError(t("ptoActionError"));
        return;
      }
      await reload();
    } finally {
      setWorking(false);
    }
  }

  async function handleBalanceSet() {
    const workerId = balanceWorkerId || session?.user?.id;
    if (!workerId || !balanceHours) {
      setError(t("ptoBalanceValidationError"));
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/time/pto/balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId,
          ptoType: balanceType,
          hours: Number(balanceHours),
          mode: "set",
        }),
      });
      if (!res.ok) {
        setError(t("ptoBalanceError"));
        return;
      }
      await reload();
    } finally {
      setWorking(false);
    }
  }

  const pending = requests.filter((r) => r.status === "submitted");

  return (
    <Card className="mt-6" density="compact">
      <CardTitle className="text-base">
        {isAdmin ? t("ptoAdminTitle") : t("ptoTitle")}
      </CardTitle>
      <p className="mt-1 text-xs text-gray-600 sm:text-sm">
        {isAdmin ? t("ptoAdminHint") : t("ptoHint")}
      </p>

      {balances.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2 text-xs text-gray-700">
          {balances.map((b) => (
            <li
              key={b.id}
              className="rounded border border-gray-200 bg-gray-50 px-2 py-1"
            >
              {t(`ptoTypes.${b.ptoType}`)}: {b.hoursBalance}h
              {isAdmin ? ` (${b.workerId})` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-gray-500">{t("ptoBalanceEmpty")}</p>
      )}

      {isAdmin ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Select
            label={t("ptoType")}
            value={balanceType}
            onChange={(e) => setBalanceType(e.target.value as PtoType)}
          >
            {PTO_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`ptoTypes.${type}`)}
              </option>
            ))}
          </Select>
          <Input
            label={t("ptoBalanceHours")}
            type="number"
            step={0.5}
            value={balanceHours}
            onChange={(e) => setBalanceHours(e.target.value)}
          />
          <Input
            label={t("ptoBalanceWorkerId")}
            type="text"
            value={balanceWorkerId}
            onChange={(e) => setBalanceWorkerId(e.target.value)}
            placeholder={session?.user?.id}
          />
          <Button onClick={() => void handleBalanceSet()} disabled={working}>
            {t("ptoBalanceSet")}
          </Button>
        </div>
      ) : null}

      {!isAdmin && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Select
            label={t("ptoType")}
            value={ptoType}
            onChange={(e) => setPtoType(e.target.value as PtoType)}
          >
            {PTO_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`ptoTypes.${type}`)}
              </option>
            ))}
          </Select>
          <Input
            label={t("ptoHoursOptional")}
            type="number"
            min={0.5}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <Input
            label={t("start")}
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <Input
            label={t("end")}
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Input
              label={t("notes")}
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button onClick={() => void handleCreate()} disabled={working}>
            {t("ptoSubmit")}
          </Button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-3 text-sm text-gray-500">{t("loading")}</p>
      ) : requests.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">{t("ptoEmpty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {(isAdmin ? pending.length > 0 ? pending : requests : requests)
            .slice(0, isAdmin ? 20 : 8)
            .map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-opseu-dark">
                    {row.workerName} · {t(`ptoTypes.${row.ptoType}`)}
                  </p>
                  <p className="text-xs text-gray-600">
                    {new Date(row.startsAt).toLocaleString()} →{" "}
                    {new Date(row.endsAt).toLocaleString()}
                    {row.hoursRequested
                      ? ` · ${row.hoursRequested}h`
                      : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t(`ptoStatus.${row.status}`)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isAdmin && row.status === "submitted" && (
                    <>
                      <Button
                        size="sm"
                        disabled={working}
                        onClick={() => void patchStatus(row.id, "approved")}
                      >
                        {t("approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={working}
                        onClick={() => void patchStatus(row.id, "rejected")}
                      >
                        {t("reject")}
                      </Button>
                    </>
                  )}
                  {!isAdmin &&
                    (row.status === "submitted" || row.status === "draft") && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={working}
                        onClick={() => void patchStatus(row.id, "cancelled")}
                      >
                        {t("ptoCancel")}
                      </Button>
                    )}
                </div>
              </li>
            ))}
        </ul>
      )}
    </Card>
  );
}
