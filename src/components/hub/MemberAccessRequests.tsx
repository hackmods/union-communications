"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";

type Row = {
  id: string;
  name: string;
  email: string;
  unionName: string;
  localName: string;
  message?: string;
  status: string;
  createdAt: string;
};

const STATUSES = [
  "new",
  "reviewing",
  "approved",
  "invited",
  "completed",
  "declined",
] as const;

export function MemberAccessRequests() {
  const t = useTranslations("hub.memberAccessRequests");
  const tStatus = useTranslations("hub.platformOperator.accessRequestStatus");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    setLoaded(false);
    void fetch("/api/access-requests")
      .then(async (r) => {
        if (!r.ok) throw new Error("load");
        setRows((await r.json()).items);
        setError("");
      })
      .catch(() => setError(t("loadFailed")))
      .finally(() => setLoaded(true));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function update(id: string, status: string) {
    const r = await fetch(`/api/access-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) {
      setRows((v) => v.map((row) => (row.id === id ? { ...row, status } : row)));
    }
  }

  function statusLabel(status: string) {
    return (STATUSES as readonly string[]).includes(status)
      ? tStatus(status as (typeof STATUSES)[number])
      : status;
  }

  if (!loaded && !error) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-opseu-dark">{t("title")}</h2>
      <p className="mt-1 text-sm text-gray-700">{t("body")}</p>
      {error ? (
        <div className="mt-3 space-y-2">
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
          <Button size="sm" variant="outline" onClick={load}>
            {t("retry")}
          </Button>
        </div>
      ) : null}
      {rows.length ? (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Card density="compact">
                <p className="font-semibold text-opseu-dark">
                  {row.name} · {statusLabel(row.status)}
                </p>
                <p className="text-sm text-gray-700">
                  {row.email} · {row.unionName} · {row.localName}
                </p>
                {row.message ? (
                  <p className="mt-2 text-sm text-gray-700">{row.message}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void update(row.id, "approved")}>
                    {t("approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void update(row.id, "declined")}
                  >
                    {t("decline")}
                  </Button>
                  <Link
                    href={`/app/invites?requestId=${row.id}`}
                    className="inline-flex min-h-9 items-center text-sm font-semibold text-opseu-blue underline"
                  >
                    {t("invite")}
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : !error ? (
        <div className="mt-3 text-sm text-gray-600">
          <p>{t("empty")}</p>
          <p className="mt-1">{t("emptyHint")}</p>
        </div>
      ) : null}
    </section>
  );
}
