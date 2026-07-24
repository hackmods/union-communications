"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { canElevateTravel } from "@/lib/travel/access";
import { estimatedTotal, sumLineItems } from "@/lib/travel/reconcile";
import type {
  CashAdvance,
  ExpenseClaim,
  TravelAuthorization,
} from "@/types/travel";
import type { UserRole } from "@/types/tenant";

type TravelItem = {
  authorization: TravelAuthorization;
  advance: CashAdvance | null;
  claim: ExpenseClaim | null;
};

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const emptyCosts = {
  travel: "",
  lodging: "",
  meals: "",
  registration: "",
  other: "",
};

export function TravelBoard() {
  const t = useTranslations("travel");
  const { data: session } = useSession();
  const roles = (session?.user?.roles ?? []) as UserRole[];
  const elevated = canElevateTravel(roles);

  const [items, setItems] = useState<TravelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventStartDate, setEventStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [eventEndDate, setEventEndDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [costs, setCosts] = useState(emptyCosts);
  const [advanceAmounts, setAdvanceAmounts] = useState<Record<string, string>>(
    {},
  );
  const [claimDrafts, setClaimDrafts] = useState<
    Record<string, { date: string; category: string; amount: string; description: string }>
  >({});

  async function refresh() {
    const res = await fetch("/api/travel");
    if (!res.ok) {
      setError(t("loadError"));
      return;
    }
    const data = (await res.json()) as { items: TravelItem[] };
    setItems(data.items);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/travel");
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { items: TravelItem[] };
        if (!cancelled) setItems(data.items);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const estimatedCosts = {
      travel: Number(costs.travel) || 0,
      lodging: Number(costs.lodging) || 0,
      meals: Number(costs.meals) || 0,
      registration: Number(costs.registration) || 0,
      other: Number(costs.other) || 0,
    };
    const res = await fetch("/api/travel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purpose: purpose.trim(),
        eventName: eventName.trim(),
        eventStartDate,
        eventEndDate,
        estimatedCosts,
      }),
    });
    if (res.ok) {
      setPurpose("");
      setEventName("");
      setCosts(emptyCosts);
      setShowForm(false);
      setMessage(t("created"));
      await refresh();
    } else {
      setError(t("createError"));
    }
  }

  async function postAction(path: string, body?: unknown) {
    setError(null);
    setMessage(null);
    const res = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      setError(t("actionError"));
      return false;
    }
    await refresh();
    return true;
  }

  async function handleExport(id: string, format: "xlsx" | "pdf" | "zip") {
    setError(null);
    try {
      const res = await fetch(`/api/travel/${id}/export?format=${format}`);
      if (!res.ok) throw new Error("fail");
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition");
      const match = disp?.match(/filename="([^"]+)"/);
      downloadBlob(blob, match?.[1] ?? `travel-export.${format}`);
      setMessage(t("exported"));
    } catch {
      setError(t("exportError"));
    }
  }

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-40 w-full" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-opseu-dark">{t("title")}</h1>
          <p className="text-sm text-gray-600">{t("subtitle")}</p>
          <p className="text-xs text-gray-500">{t("disclaimer")}</p>
        </header>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? t("cancel") : t("newRequest")}
          </Button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
          >
            <Input
              label={t("fields.eventName")}
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
            />
            <Textarea
              label={t("fields.purpose")}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="date"
                label={t("fields.eventStart")}
                value={eventStartDate}
                onChange={(e) => setEventStartDate(e.target.value)}
                required
              />
              <Input
                type="date"
                label={t("fields.eventEnd")}
                value={eventEndDate}
                onChange={(e) => setEventEndDate(e.target.value)}
                required
              />
            </div>
            <fieldset className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <legend className="mb-1 text-sm font-medium text-gray-700">
                {t("fields.estimatedCosts")}
              </legend>
              {(
                ["travel", "lodging", "meals", "registration", "other"] as const
              ).map((key) => (
                <Input
                  key={key}
                  type="number"
                  min={0}
                  step="0.01"
                  label={t(`cost.${key}`)}
                  value={costs[key]}
                  onChange={(e) =>
                    setCosts((c) => ({ ...c, [key]: e.target.value }))
                  }
                />
              ))}
            </fieldset>
            <Button type="submit">{t("save")}</Button>
          </form>
        )}

        {items.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <ul className="space-y-4">
            {items.map(({ authorization: auth, advance, claim }) => {
              const draft =
                claimDrafts[auth.id] ?? {
                  date: new Date().toISOString().slice(0, 10),
                  category: "travel",
                  amount: "",
                  description: "",
                };
              return (
                <li
                  key={auth.id}
                  className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-opseu-dark">
                        {auth.eventName}
                      </h2>
                      <p className="text-sm text-gray-600">{auth.purpose}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {auth.eventStartDate} – {auth.eventEndDate} ·{" "}
                        {auth.requestedByName} · {t(`status.${auth.status}`)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t("estimatedTotal")}:{" "}
                        {formatMoney(estimatedTotal(auth.estimatedCosts))}
                        {advance
                          ? ` · ${t("advance")}: ${formatMoney(advance.amount)}`
                          : ""}
                        {claim
                          ? ` · ${t("claimSpend")}: ${formatMoney(sumLineItems(claim.lineItems))} (${t(`claimStatus.${claim.status}`)})`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleExport(auth.id, "xlsx")}
                      >
                        {t("exportXlsx")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleExport(auth.id, "pdf")}
                      >
                        {t("exportPdf")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleExport(auth.id, "zip")}
                      >
                        {t("exportZipStub")}
                      </Button>
                    </div>
                  </div>

                  {elevated && auth.status === "requested" && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          if (await postAction(`/api/travel/${auth.id}/approve`)) {
                            setMessage(t("approved"));
                          }
                        }}
                      >
                        {t("approve")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          if (
                            await postAction(`/api/travel/${auth.id}/deny`, {})
                          ) {
                            setMessage(t("denied"));
                          }
                        }}
                      >
                        {t("deny")}
                      </Button>
                    </div>
                  )}

                  {elevated && auth.status === "approved" && !advance && (
                    <div className="flex flex-wrap items-end gap-2">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        label={t("advanceAmount")}
                        value={advanceAmounts[auth.id] ?? ""}
                        onChange={(e) =>
                          setAdvanceAmounts((m) => ({
                            ...m,
                            [auth.id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          const amount = Number(advanceAmounts[auth.id]);
                          if (!Number.isFinite(amount) || amount <= 0) {
                            setError(t("actionError"));
                            return;
                          }
                          if (
                            await postAction(`/api/travel/${auth.id}/advance`, {
                              amount,
                            })
                          ) {
                            setMessage(t("advanceIssued"));
                          }
                        }}
                      >
                        {t("issueAdvance")}
                      </Button>
                    </div>
                  )}

                  {auth.status === "approved" && !claim && (
                    <div className="space-y-2 rounded-md border border-dashed border-gray-300 p-3">
                      <p className="text-sm font-medium">{t("addClaim")}</p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <Input
                          type="date"
                          label={t("fields.lineDate")}
                          value={draft.date}
                          onChange={(e) =>
                            setClaimDrafts((d) => ({
                              ...d,
                              [auth.id]: { ...draft, date: e.target.value },
                            }))
                          }
                        />
                        <Input
                          label={t("fields.lineCategory")}
                          value={draft.category}
                          onChange={(e) =>
                            setClaimDrafts((d) => ({
                              ...d,
                              [auth.id]: {
                                ...draft,
                                category: e.target.value,
                              },
                            }))
                          }
                        />
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          label={t("fields.lineAmount")}
                          value={draft.amount}
                          onChange={(e) =>
                            setClaimDrafts((d) => ({
                              ...d,
                              [auth.id]: { ...draft, amount: e.target.value },
                            }))
                          }
                        />
                        <Input
                          label={t("fields.lineDescription")}
                          value={draft.description}
                          onChange={(e) =>
                            setClaimDrafts((d) => ({
                              ...d,
                              [auth.id]: {
                                ...draft,
                                description: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          const amount = Number(draft.amount);
                          if (
                            !draft.description.trim() ||
                            !Number.isFinite(amount) ||
                            amount <= 0
                          ) {
                            setError(t("actionError"));
                            return;
                          }
                          if (
                            await postAction(`/api/travel/${auth.id}/claim`, {
                              lineItems: [
                                {
                                  date: draft.date,
                                  category: draft.category.trim() || "travel",
                                  amount,
                                  description: draft.description.trim(),
                                },
                              ],
                            })
                          ) {
                            setMessage(t("claimCreated"));
                          }
                        }}
                      >
                        {t("saveClaim")}
                      </Button>
                    </div>
                  )}

                  {elevated &&
                    claim &&
                    claim.status !== "reconciled" && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          if (
                            await postAction(
                              `/api/travel/${auth.id}/reconcile`,
                            )
                          ) {
                            setMessage(t("reconciled"));
                          }
                        }}
                      >
                        {t("reconcile")}
                      </Button>
                    )}

                  {claim?.status === "reconciled" &&
                    claim.difference !== undefined && (
                      <p className="text-sm text-gray-700">
                        {t("differenceLabel")}: {formatMoney(claim.difference)}{" "}
                        {claim.difference > 0
                          ? t("differenceOwesOfficer")
                          : claim.difference < 0
                            ? t("differenceOwesLocal")
                            : t("differenceEven")}
                      </p>
                    )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
