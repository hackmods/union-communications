"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

type ObsHealth = {
  backend: string;
  storeEnabled: boolean;
  errorLogFileEnabled: boolean;
  errorLogFileMisconfigured: boolean;
  sentryEnabled: boolean;
  sentryClientEnabled: boolean;
};

type ObsEvent = {
  id: string;
  ts: string;
  level: string;
  source: string;
  message: string;
  route?: string;
  signal?: string | null;
  build?: string;
};

export function ObservabilityPanelClient({
  initialHealth,
}: {
  initialHealth: ObsHealth;
}) {
  const t = useTranslations("hub.platformOperator");
  const [health, setHealth] = useState(initialHealth);
  const [events, setEvents] = useState<ObsEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [limit, setLimit] = useState(50);
  const [exporting, setExporting] = useState<"csv" | "jsonl" | null>(null);

  const handleMfaCodes = useCallback(
    (data: { code?: string; error?: string }) => {
      if (data.code === "mfa_step_up_required") {
        setStepUpRequired(true);
        setError(t("observabilityMfaRequired"));
        return true;
      }
      if (data.code === "mfa_step_up_failed") {
        setStepUpRequired(true);
        setMfaCode("");
        setError(t("observabilityMfaFailed"));
        return true;
      }
      if (data.code === "mfa_step_up_limited") {
        setStepUpRequired(true);
        setMfaCode("");
        setError(t("observabilityMfaLimited"));
        return true;
      }
      if (
        data.code === "mfa_step_up_unavailable" ||
        data.code === "audit_unavailable"
      ) {
        setStepUpRequired(false);
        setMfaCode("");
        setError(t("observabilityUnavailable"));
        return true;
      }
      if (data.code === "observability_store_disabled") {
        setStepUpRequired(false);
        setError(t("observabilityStoreDisabled"));
        return true;
      }
      return false;
    },
    [t],
  );

  const load = useCallback(
    async (code?: string, isCurrent: () => boolean = () => true) => {
      if (isCurrent()) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch("/api/site-admin/observability/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            limit,
            ...(code ? { mfaCode: code } : {}),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          events?: ObsEvent[];
          health?: ObsHealth;
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          if (!isCurrent()) return;
          if (handleMfaCodes(data)) return;
          if (data.code === "query_result_unconfirmed") {
            setError(t("observabilityUnconfirmed"));
            return;
          }
          setError(data.error ?? t("observabilityLoadError"));
          return;
        }
        if (!isCurrent()) return;
        setEvents(data.events ?? []);
        if (data.health) setHealth(data.health);
        setStepUpRequired(false);
        setMfaCode("");
      } catch {
        if (isCurrent()) setError(t("observabilityLoadError"));
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [handleMfaCodes, limit, t],
  );

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(undefined, () => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function download(format: "csv" | "jsonl") {
    setExporting(format);
    setError(null);
    try {
      const res = await fetch("/api/site-admin/observability/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          format,
          limit,
          ...(mfaCode || stepUpRequired ? { mfaCode } : {}),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        if (handleMfaCodes(data)) return;
        if (data.code === "export_audit_unavailable") {
          setError(t("observabilityExportUnconfirmed"));
          return;
        }
        setError(data.error ?? t("observabilityExportError"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        format === "csv" ? "unionops-errors.csv" : "unionops-errors.jsonl";
      a.click();
      URL.revokeObjectURL(url);
      setStepUpRequired(false);
      setMfaCode("");
    } catch {
      setError(t("observabilityExportError"));
    } finally {
      setExporting(null);
    }
  }

  function submitChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(mfaCode);
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-opseu-dark sm:text-3xl">
        {t("observabilityTitle")}
      </h1>
      <p className="mt-1 text-sm text-gray-600 sm:text-base">
        {t("observabilitySubtitle")}
      </p>

      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-opseu-gray-light bg-white px-3 py-2">
          <dt className="text-opseu-gray-dark">{t("observabilityBackend")}</dt>
          <dd className="font-medium text-opseu-dark">{health.backend}</dd>
        </div>
        <div className="rounded-lg border border-opseu-gray-light bg-white px-3 py-2">
          <dt className="text-opseu-gray-dark">{t("observabilityStore")}</dt>
          <dd className="font-medium text-opseu-dark">
            {health.storeEnabled
              ? t("observabilityStoreOn")
              : t("observabilityStoreOff")}
          </dd>
        </div>
      </dl>

      <Callout tone="warning" className="mt-4">
        {t("observabilityPiiWarning")}
      </Callout>

      {stepUpRequired ? (
        <form
          onSubmit={submitChallenge}
          className="mt-4 max-w-md space-y-3 rounded-lg border border-amber-700/20 bg-amber-50 p-4"
        >
          <p className="text-sm text-amber-950">{t("observabilityMfaPrompt")}</p>
          <Input
            label={t("observabilityMfaLabel")}
            name="mfaCode"
            autoComplete="one-time-code"
            inputMode="numeric"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
          />
          <Button type="submit" variant="primary">
            {t("observabilityMfaSubmit")}
          </Button>
        </form>
      ) : null}

      {error ? (
        <Callout tone="danger" className="mt-4">
          {error}
        </Callout>
      ) : null}

      <div className="mt-4 flex flex-wrap items-end gap-3">
          <Input
            label={t("observabilityLimit")}
            name="limit"
            type="number"
            min={1}
            max={500}
            value={String(limit)}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              if (Number.isFinite(n)) setLimit(Math.min(500, Math.max(1, n)));
            }}
            className="w-28"
          />
        <Button
          type="button"
          variant="secondary"
          disabled={!!exporting || !health.storeEnabled}
          onClick={() => void download("csv")}
        >
          {exporting === "csv"
            ? t("observabilityExporting")
            : t("observabilityDownloadCsv")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!!exporting || !health.storeEnabled}
          onClick={() => void download("jsonl")}
        >
          {exporting === "jsonl"
            ? t("observabilityExporting")
            : t("observabilityDownloadJsonl")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={loading}
          onClick={() => void load(mfaCode || undefined)}
        >
          {t("observabilityRefresh")}
        </Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : events.length === 0 ? (
          <EmptyState
            title={t("observabilityEmptyTitle")}
            description={t("observabilityEmptyBody")}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-opseu-gray-light">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-opseu-gray-light/40 text-opseu-gray-dark">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("observabilityColTs")}</th>
                  <th className="px-3 py-2 font-medium">{t("observabilityColLevel")}</th>
                  <th className="px-3 py-2 font-medium">{t("observabilityColSource")}</th>
                  <th className="px-3 py-2 font-medium">{t("observabilityColMessage")}</th>
                  <th className="px-3 py-2 font-medium">{t("observabilityColRoute")}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} className="border-t border-opseu-gray-light">
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                      {ev.ts}
                    </td>
                    <td className="px-3 py-2">{ev.level}</td>
                    <td className="px-3 py-2">{ev.source}</td>
                    <td className="max-w-md truncate px-3 py-2" title={ev.message}>
                      {ev.message}
                      {ev.signal ? (
                        <span className="ml-1 text-xs text-opseu-gray-dark">
                          ({ev.signal})
                        </span>
                      ) : null}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 font-mono text-xs">
                      {ev.route ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
