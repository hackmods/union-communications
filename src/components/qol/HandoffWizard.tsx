"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { HANDOFF_CHECKLIST } from "@/lib/handoff/package";
import type { Grievance } from "@/types/grievance";
import type { HandoffPackage } from "@/types/qol";

interface StewardOption {
  id: string;
  name: string;
  email: string;
}

export function HandoffWizard() {
  const t = useTranslations("qol");
  const tg = useTranslations("grievance");
  const [step, setStep] = useState(1);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [stewards, setStewards] = useState<StewardOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stewardId, setStewardId] = useState("");
  const [notes, setNotes] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<HandoffPackage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/handoff")
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 403) setError(t("handoff.forbidden"));
          else setError(t("handoff.loadError"));
          return;
        }
        const data = await res.json();
        setGrievances(data.grievances);
        setStewards(data.stewards);
        setSelectedIds(new Set(data.grievances.map((g: Grievance) => g.id)));
        if (data.stewards[0]) setStewardId(data.stewards[0].id);
      })
      .catch(() => setError(t("handoff.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function completeHandoff() {
    const steward = stewards.find((s) => s.id === stewardId);
    if (!steward) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toStewardId: steward.id,
        toStewardName: steward.name,
        grievanceIds: Array.from(selectedIds),
        notes: notes || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(t("handoff.completeError"));
      return;
    }
    const data = await res.json();
    setResult(data.package);
    setStep(4);
  }

  function downloadPackage() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `handoff-${result.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label={t("handoff.loading")}>
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error && step === 1 && grievances.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-opseu-dark">{t("handoff.title")}</h1>
        <p className="mt-4 text-red-700" role="alert">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-opseu-dark">{t("handoff.title")}</h1>
      <p className="mt-1 text-gray-600">{t("handoff.subtitle")}</p>

      <ol className="mt-4 flex flex-wrap gap-2 text-sm">
        {[1, 2, 3, 4].map((n) => (
          <li
            key={n}
            className={`rounded-md px-3 py-1 ${
              step === n
                ? "bg-opseu-blue text-white"
                : step > n
                  ? "bg-opseu-blue/10 text-opseu-dark"
                  : "bg-gray-100 text-gray-500"
            }`}
          >
            {t(`handoff.step${n}`)}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <Card className="mt-6 space-y-3">
          <CardTitle>{t("handoff.selectCases")}</CardTitle>
          {grievances.length === 0 ? (
            <EmptyState title={t("handoff.empty")} />
          ) : (
            grievances.map((g) => (
              <label key={g.id} className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={selectedIds.has(g.id)}
                  onChange={() => toggleId(g.id)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">
                    {g.memberPseudonym ?? tg("anonymousMember")} - {g.category}
                  </span>
                  <span className="block text-gray-500">
                    {tg("step", { step: g.currentStep })} ·{" "}
                    {tg(`status.${g.status}`)}
                  </span>
                </span>
              </label>
            ))
          )}
          <Button
            onClick={() => setStep(2)}
            disabled={selectedIds.size === 0}
          >
            {t("handoff.next")}
          </Button>
        </Card>
      )}

      {step === 2 && (
        <Card className="mt-6 space-y-3">
          <CardTitle>{t("handoff.selectSteward")}</CardTitle>
          <select
            value={stewardId}
            onChange={(e) => setStewardId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            {stewards.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email})
              </option>
            ))}
          </select>
          <Textarea
            label={t("handoff.notes")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              {t("handoff.back")}
            </Button>
            <Button onClick={() => setStep(3)} disabled={!stewardId}>
              {t("handoff.next")}
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="mt-6 space-y-3">
          <CardTitle>{t("handoff.checklist")}</CardTitle>
          <p className="text-sm text-gray-600">{t("handoff.checklistHint")}</p>
          {HANDOFF_CHECKLIST.map((item) => (
            <label key={item} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={!!checked[item]}
                onChange={(e) =>
                  setChecked((prev) => ({ ...prev, [item]: e.target.checked }))
                }
                className="mt-1"
              />
              <span>{item}</span>
            </label>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              {t("handoff.back")}
            </Button>
            <Button onClick={() => void completeHandoff()} disabled={busy}>
              {busy ? t("handoff.working") : t("handoff.complete")}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
        </Card>
      )}

      {step === 4 && result && (
        <Card className="mt-6 space-y-3">
          <CardTitle>{t("handoff.done")}</CardTitle>
          <p className="text-sm text-gray-700">
            {t("handoff.doneDesc", {
              count: result.grievanceIds.length,
              name: result.toStewardName,
            })}
          </p>
          <Button onClick={downloadPackage}>{t("handoff.download")}</Button>
        </Card>
      )}
    </div>
  );
}
