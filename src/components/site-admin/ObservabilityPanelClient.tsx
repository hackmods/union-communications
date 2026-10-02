"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

type ObsHealth = {
  backend: string;
  storeEnabled: boolean;
  fileDualWrite?: boolean;
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
  name?: string;
  stack?: string;
  route?: string;
  signal?: string | null;
  build?: string;
  requestId?: string;
  fingerprint?: string;
  meta?: Record<string, string | number | boolean | null>;
};

type ObsIssue = {
  fingerprint: string;
  count: number;
  lastTs: string;
  sampleMessage: string;
  level: string;
  route?: string;
  source?: string;
};

type ObsAck = {
  fingerprint: string;
  acknowledgedAt: string;
  acknowledgedBy: string;
  note?: string;
};

type ObsAlertsMeta = {
  backend?: string;
  acksBackend?: string;
  postgresRequired: boolean;
  enabled: boolean;
  autoAckOnDeploy?: boolean;
  defaultRecipientConfigured: boolean;
};

type ObsAlertRule = {
  id: string;
  name: string;
  enabled: boolean;
  minLevel: string;
  thresholdCount: number;
  windowMinutes: number;
  cooldownMinutes: number;
  recipients: string[];
  unionId?: string | null;
  emailFormat?: "multipart" | "plain";
};

type ObsSummary = {
  total: number;
  byLevel: { error: number; warn: number; info: number };
  bySource: { server: number; client: number; cron: number; edge: number };
  byFingerprint: ObsIssue[];
};

type ObsStoreStats = {
  backend: string;
  eventCountEstimate: number | null;
  fileBytes: number | null;
  rotatedFiles: number | null;
};

type ViewMode = "issues" | "events";
type TimeWindow = "1h" | "24h" | "7d" | "all";

function levelClass(level: string): string {
  if (level === "error") return "bg-red-100 text-red-900";
  if (level === "warn") return "bg-amber-100 text-amber-950";
  return "bg-gray-100 text-gray-800";
}

export function ObservabilityPanelClient({
  initialHealth,
}: {
  initialHealth: ObsHealth;
}) {
  const t = useTranslations("hub.platformOperator");
  const [health, setHealth] = useState(initialHealth);
  const [events, setEvents] = useState<ObsEvent[]>([]);
  const [issues, setIssues] = useState<ObsIssue[]>([]);
  const [acks, setAcks] = useState<ObsAck[]>([]);
  const [alertRules, setAlertRules] = useState<ObsAlertRule[]>([]);
  const [alertsMeta, setAlertsMeta] = useState<ObsAlertsMeta | null>(null);
  const [summary, setSummary] = useState<ObsSummary | null>(null);
  const [storeStats, setStoreStats] = useState<ObsStoreStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [limit, setLimit] = useState(100);
  const [level, setLevel] = useState<"" | "error" | "warn" | "info">("");
  const [source, setSource] = useState<"" | "server" | "client" | "cron" | "edge">("");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("24h");
  const [q, setQ] = useState("");
  const [view, setView] = useState<ViewMode>("issues");
  const [selected, setSelected] = useState<ObsEvent | ObsIssue | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hideAcked, setHideAcked] = useState(true);
  const [ackBusy, setAckBusy] = useState(false);
  const [ackNote, setAckNote] = useState("");
  const [ruleName, setRuleName] = useState("Host errors");
  const [ruleThreshold, setRuleThreshold] = useState(5);
  const [ruleWindow, setRuleWindow] = useState(15);
  const [ruleCooldown, setRuleCooldown] = useState(60);
  const [ruleRecipients, setRuleRecipients] = useState("");
  const [ruleUnionId, setRuleUnionId] = useState("");
  const [rulePlain, setRulePlain] = useState(false);
  const [ruleBusy, setRuleBusy] = useState(false);

  const ackByFp = useMemo(() => {
    const map = new Map<string, ObsAck>();
    for (const ack of acks) map.set(ack.fingerprint, ack);
    return map;
  }, [acks]);

  const visibleIssues = useMemo(() => {
    if (!hideAcked) return issues;
    return issues.filter((issue) => !ackByFp.has(issue.fingerprint));
  }, [issues, hideAcked, ackByFp]);

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
      if (
        data.code === "acks_require_postgres" ||
        data.code === "alerts_require_postgres" ||
        data.code === "acks_backend_unavailable" ||
        data.code === "alerts_backend_unavailable"
      ) {
        setError(t("observabilityAcksRequirePostgres"));
        return true;
      }
      return false;
    },
    [t],
  );

  const filterBody = useCallback(
    (code?: string) => ({
      limit,
      ...(timeWindow !== "all" ? { since: timeWindow } : {}),
      ...(level ? { level } : {}),
      ...(source ? { source } : {}),
      ...(q.trim() ? { q: q.trim() } : {}),
      ...(code ? { mfaCode: code } : {}),
    }),
    [limit, timeWindow, level, source, q],
  );

  const loadAlertRules = useCallback(async () => {
    try {
      const res = await fetch("/api/site-admin/observability/alert-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "list" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        rules?: ObsAlertRule[];
        code?: string;
      };
      if (res.ok) {
        setAlertRules(data.rules ?? []);
      } else if (
        data.code === "alerts_require_postgres" ||
        res.status === 503
      ) {
        setAlertRules([]);
      }
    } catch {
      /* non-blocking */
    }
  }, []);

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
          body: JSON.stringify(filterBody(code)),
        });
        const data = (await res.json().catch(() => ({}))) as {
          events?: ObsEvent[];
          issues?: ObsIssue[];
          acks?: ObsAck[];
          alerts?: ObsAlertsMeta;
          summary?: ObsSummary;
          storeStats?: ObsStoreStats;
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
        setIssues(data.issues ?? data.summary?.byFingerprint ?? []);
        setAcks(data.acks ?? []);
        if (data.alerts) setAlertsMeta(data.alerts);
        setSummary(data.summary ?? null);
        setStoreStats(data.storeStats ?? null);
        if (data.health) setHealth(data.health);
        setStepUpRequired(false);
        setMfaCode("");
        setLastUpdated(new Date());
        setAutoRefresh(true);
        void loadAlertRules();
      } catch {
        if (isCurrent()) setError(t("observabilityLoadError"));
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [filterBody, handleMfaCodes, loadAlertRules, t],
  );

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(undefined, () => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!autoRefresh || stepUpRequired) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(mfaCode || undefined);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [autoRefresh, load, mfaCode, stepUpRequired]);

  async function download(format: "csv" | "jsonl" | "incident-pack") {
    setExporting(format);
    setError(null);
    try {
      const res = await fetch("/api/site-admin/observability/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          format,
          ...filterBody(mfaCode || stepUpRequired ? mfaCode : undefined),
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
        format === "csv"
          ? "unionops-errors.csv"
          : format === "jsonl"
            ? "unionops-errors.jsonl"
            : "unionops-incident-pack.zip";
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

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* ignore */
    }
  }

  async function toggleAck(fingerprint: string, currentlyAcked: boolean) {
    setAckBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/site-admin/observability/acks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          fingerprint,
          action: currentlyAcked ? "unack" : "ack",
          ...(currentlyAcked || !ackNote.trim()
            ? {}
            : { note: ackNote.trim() }),
          ...(mfaCode ? { mfaCode } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        code?: string;
        error?: string;
        ack?: ObsAck;
      };
      if (!res.ok) {
        if (handleMfaCodes(data)) return;
        setError(data.error ?? t("observabilityAckError"));
        return;
      }
      setAckNote("");
      setStepUpRequired(false);
      setMfaCode("");
      if (currentlyAcked) {
        setAcks((prev) => prev.filter((a) => a.fingerprint !== fingerprint));
      } else if (data.ack) {
        setAcks((prev) => [
          data.ack!,
          ...prev.filter((a) => a.fingerprint !== fingerprint),
        ]);
      }
    } catch {
      setError(t("observabilityAckError"));
    } finally {
      setAckBusy(false);
    }
  }

  async function createAlertRule() {
    setRuleBusy(true);
    setError(null);
    const recipients = ruleRecipients
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/site-admin/observability/alert-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "create",
          name: ruleName.trim() || "Host errors",
          minLevel: "error",
          thresholdCount: ruleThreshold,
          windowMinutes: ruleWindow,
          cooldownMinutes: ruleCooldown,
          emailFormat: rulePlain ? "plain" : "multipart",
          ...(ruleUnionId.trim() ? { unionId: ruleUnionId.trim() } : {}),
          ...(recipients.length ? { recipients } : {}),
          ...(mfaCode ? { mfaCode } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        code?: string;
        error?: string;
        rule?: ObsAlertRule;
      };
      if (!res.ok) {
        if (handleMfaCodes(data)) return;
        setError(data.error ?? t("observabilityAlertError"));
        return;
      }
      setStepUpRequired(false);
      setMfaCode("");
      if (data.rule) setAlertRules((prev) => [data.rule!, ...prev]);
    } catch {
      setError(t("observabilityAlertError"));
    } finally {
      setRuleBusy(false);
    }
  }

  async function deleteAlertRule(id: string) {
    setRuleBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/site-admin/observability/alert-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "delete",
          id,
          ...(mfaCode ? { mfaCode } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        code?: string;
        error?: string;
      };
      if (!res.ok) {
        if (handleMfaCodes(data)) return;
        setError(data.error ?? t("observabilityAlertError"));
        return;
      }
      setStepUpRequired(false);
      setMfaCode("");
      setAlertRules((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError(t("observabilityAlertError"));
    } finally {
      setRuleBusy(false);
    }
  }

  const selectedFingerprint =
    selected && "fingerprint" in selected ? selected.fingerprint : null;
  const selectedAck = selectedFingerprint
    ? ackByFp.get(selectedFingerprint)
    : undefined;

  const selectedEvent =
    selected && "message" in selected && "id" in selected
      ? (selected as ObsEvent)
      : selected && "fingerprint" in selected
        ? events.find((e) => e.fingerprint === selected.fingerprint) ?? null
        : null;

  const alertsAvailable =
    alertsMeta?.backend === "postgres" ||
    alertsMeta?.backend === "file" ||
    (alertsMeta != null && !alertsMeta.postgresRequired);

  return (
    <>
      <h1 className="text-2xl font-bold text-opseu-dark sm:text-3xl">
        {t("observabilityTitle")}
      </h1>
      <p className="mt-1 text-sm text-gray-600 sm:text-base">
        {t("observabilitySubtitle")}
      </p>

      {!health.storeEnabled ? (
        <Callout tone="warning" className="mt-4">
          {t("observabilitySetupDocker")}
        </Callout>
      ) : null}

      {health.storeEnabled && !alertsAvailable ? (
        <Callout tone="warning" className="mt-4">
          {t("observabilityAcksRequirePostgres")}
        </Callout>
      ) : null}

      {alertsMeta?.autoAckOnDeploy ? (
        <Callout tone="brand" className="mt-4">
          {t("observabilityAutoAckOn")}
        </Callout>
      ) : null}

      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
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
        <div className="rounded-lg border border-opseu-gray-light bg-white px-3 py-2">
          <dt className="text-opseu-gray-dark">{t("observabilityDualWrite")}</dt>
          <dd className="font-medium text-opseu-dark">
            {health.fileDualWrite
              ? t("observabilityDualWriteOn")
              : t("observabilityDualWriteOff")}
          </dd>
        </div>
      </dl>

      {summary ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
          <div className="rounded-lg border border-opseu-gray-light px-3 py-2">
            <dt className="text-opseu-gray-dark">{t("observabilityStatTotal")}</dt>
            <dd className="text-lg font-semibold text-opseu-dark">{summary.total}</dd>
          </div>
          <div className="rounded-lg border border-opseu-gray-light px-3 py-2">
            <dt className="text-opseu-gray-dark">{t("observabilityStatErrors")}</dt>
            <dd className="text-lg font-semibold text-red-800">{summary.byLevel.error}</dd>
          </div>
          <div className="rounded-lg border border-opseu-gray-light px-3 py-2">
            <dt className="text-opseu-gray-dark">{t("observabilityStatWarns")}</dt>
            <dd className="text-lg font-semibold text-amber-900">{summary.byLevel.warn}</dd>
          </div>
          <div className="rounded-lg border border-opseu-gray-light px-3 py-2">
            <dt className="text-opseu-gray-dark">{t("observabilityStatClient")}</dt>
            <dd className="text-lg font-semibold text-opseu-dark">{summary.bySource.client}</dd>
          </div>
          <div className="rounded-lg border border-opseu-gray-light px-3 py-2">
            <dt className="text-opseu-gray-dark">{t("observabilityStatIssues")}</dt>
            <dd className="text-lg font-semibold text-opseu-dark">{visibleIssues.length}</dd>
          </div>
        </dl>
      ) : null}

      {storeStats?.eventCountEstimate != null ? (
        <p className="mt-2 text-xs text-opseu-gray-dark">
          {t("observabilityStoreStats", {
            count: storeStats.eventCountEstimate,
            rotated: storeStats.rotatedFiles ?? 0,
          })}
        </p>
      ) : null}

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
        <label className="text-sm text-opseu-gray-dark">
          {t("observabilityWindow")}
          <select
            className="mt-1 block min-h-11 rounded-lg border border-gray-300 px-3 py-2"
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value as TimeWindow)}
          >
            <option value="1h">{t("observabilityWindow1h")}</option>
            <option value="24h">{t("observabilityWindow24h")}</option>
            <option value="7d">{t("observabilityWindow7d")}</option>
            <option value="all">{t("observabilityWindowAll")}</option>
          </select>
        </label>
        <label className="text-sm text-opseu-gray-dark">
          {t("observabilityColLevel")}
          <select
            className="mt-1 block min-h-11 rounded-lg border border-gray-300 px-3 py-2"
            value={level}
            onChange={(e) =>
              setLevel(e.target.value as "" | "error" | "warn" | "info")
            }
          >
            <option value="">{t("observabilityFilterAny")}</option>
            <option value="error">error</option>
            <option value="warn">warn</option>
            <option value="info">info</option>
          </select>
        </label>
        <label className="text-sm text-opseu-gray-dark">
          {t("observabilityColSource")}
          <select
            className="mt-1 block min-h-11 rounded-lg border border-gray-300 px-3 py-2"
            value={source}
            onChange={(e) =>
              setSource(
                e.target.value as "" | "server" | "client" | "cron" | "edge",
              )
            }
          >
            <option value="">{t("observabilityFilterAny")}</option>
            <option value="server">server</option>
            <option value="client">client</option>
            <option value="cron">cron</option>
            <option value="edge">edge</option>
          </select>
        </label>
        <Input
          label={t("observabilitySearch")}
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-48"
        />
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
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={view === "issues" ? "primary" : "secondary"}
          onClick={() => setView("issues")}
        >
          {t("observabilityViewIssues")}
        </Button>
        <Button
          type="button"
          variant={view === "events" ? "primary" : "secondary"}
          onClick={() => setView("events")}
        >
          {t("observabilityViewEvents")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!!exporting || !health.storeEnabled}
          onClick={() => void download("csv")}
        >
          {exporting === "csv" ? t("observabilityExporting") : t("observabilityDownloadCsv")}
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
          variant="secondary"
          disabled={!!exporting || !health.storeEnabled}
          onClick={() => void download("incident-pack")}
        >
          {exporting === "incident-pack"
            ? t("observabilityExporting")
            : t("observabilityDownloadPack")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={loading}
          onClick={() => void load(mfaCode || undefined)}
        >
          {t("observabilityRefresh")}
        </Button>
        {lastUpdated ? (
          <span className="text-sm text-opseu-gray-dark">
            {t("observabilityLastUpdated", {
              time: lastUpdated.toLocaleTimeString(),
            })}
          </span>
        ) : null}
        <label className="ml-2 flex items-center gap-2 text-sm text-opseu-gray-dark">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          {t("observabilityAutoRefresh")}
        </label>
        {view === "issues" ? (
          <label className="ml-2 flex items-center gap-2 text-sm text-opseu-gray-dark">
            <input
              type="checkbox"
              checked={hideAcked}
              onChange={(e) => setHideAcked(e.target.checked)}
            />
            {t("observabilityHideAcked")}
          </label>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <div>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : view === "issues" ? (
            visibleIssues.length === 0 ? (
              <EmptyState
                title={t("observabilityEmptyTitle")}
                description={t("observabilityEmptyBody")}
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-opseu-gray-light">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-opseu-gray-light/40 text-opseu-gray-dark">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t("observabilityColCount")}</th>
                      <th className="px-3 py-2 font-medium">{t("observabilityColLevel")}</th>
                      <th className="px-3 py-2 font-medium">{t("observabilityColMessage")}</th>
                      <th className="px-3 py-2 font-medium">{t("observabilityColLast")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleIssues.map((issue) => {
                      const acked = ackByFp.has(issue.fingerprint);
                      return (
                        <tr
                          key={issue.fingerprint}
                          className="cursor-pointer border-t border-opseu-gray-light hover:bg-opseu-blue/5"
                          onClick={() => setSelected(issue)}
                        >
                          <td className="px-3 py-2 font-semibold">{issue.count}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-xs font-medium ${levelClass(issue.level)}`}
                            >
                              {issue.level}
                            </span>
                            {acked ? (
                              <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-900">
                                {t("observabilityAckedBadge")}
                              </span>
                            ) : null}
                          </td>
                          <td className="max-w-md truncate px-3 py-2" title={issue.sampleMessage}>
                            {issue.sampleMessage}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                            {issue.lastTs}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
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
                    <tr
                      key={ev.id}
                      className="cursor-pointer border-t border-opseu-gray-light hover:bg-opseu-blue/5"
                      onClick={() => setSelected(ev)}
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                        {ev.ts}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${levelClass(ev.level)}`}
                        >
                          {ev.level}
                        </span>
                      </td>
                      <td className="px-3 py-2">{ev.source}</td>
                      <td className="max-w-md truncate px-3 py-2" title={ev.message}>
                        {ev.message}
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

        <aside className="rounded-lg border border-opseu-gray-light bg-white p-4 text-sm">
          <h2 className="font-semibold text-opseu-dark">
            {t("observabilityDetailTitle")}
          </h2>
          {!selectedEvent && !selected ? (
            <p className="mt-2 text-opseu-gray-dark">{t("observabilityDetailEmpty")}</p>
          ) : selectedEvent ? (
            <div className="mt-3 space-y-2">
              <p>
                <span className="text-opseu-gray-dark">{t("observabilityColLevel")}: </span>
                {selectedEvent.level}
              </p>
              <p className="break-words">{selectedEvent.message}</p>
              {selectedEvent.route ? (
                <p className="font-mono text-xs">{selectedEvent.route}</p>
              ) : null}
              {selectedEvent.fingerprint ? (
                <p className="font-mono text-xs">
                  {t("observabilityFingerprint")}: {selectedEvent.fingerprint}
                </p>
              ) : null}
              {selectedEvent.requestId ? (
                <p className="font-mono text-xs">
                  {t("observabilityRequestId")}: {selectedEvent.requestId}
                </p>
              ) : null}
              {selectedEvent.fingerprint && alertsAvailable ? (
                <div className="space-y-2 border-t border-opseu-gray-light pt-2">
                  {!selectedAck ? (
                    <Input
                      label={t("observabilityAckNote")}
                      name="ackNote"
                      value={ackNote}
                      onChange={(e) => setAckNote(e.target.value)}
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={ackBusy}
                    onClick={() =>
                      void toggleAck(
                        selectedEvent.fingerprint!,
                        Boolean(selectedAck),
                      )
                    }
                  >
                    {selectedAck ? t("observabilityUnack") : t("observabilityAck")}
                  </Button>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void copyText(selectedEvent.id)}
                >
                  {t("observabilityCopyId")}
                </Button>
                {selectedEvent.stack ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void copyText(selectedEvent.stack!)}
                  >
                    {t("observabilityCopyStack")}
                  </Button>
                ) : null}
              </div>
              {selectedEvent.stack ? (
                <pre className="mt-2 max-h-80 overflow-auto rounded bg-gray-50 p-2 font-mono text-xs whitespace-pre-wrap">
                  {selectedEvent.stack}
                </pre>
              ) : (
                <p className="text-opseu-gray-dark">{t("observabilityNoStack")}</p>
              )}
            </div>
          ) : selected && "sampleMessage" in selected ? (
            <div className="mt-3 space-y-2">
              <p className="font-medium">{selected.sampleMessage}</p>
              <p>
                {t("observabilityColCount")}: {selected.count}
              </p>
              <p className="font-mono text-xs">{selected.fingerprint}</p>
              {selectedAck ? (
                <p className="text-emerald-900">{t("observabilityAckedBadge")}</p>
              ) : null}
              {alertsAvailable ? (
                <div className="space-y-2">
                  {!selectedAck ? (
                    <Input
                      label={t("observabilityAckNote")}
                      name="ackNoteIssue"
                      value={ackNote}
                      onChange={(e) => setAckNote(e.target.value)}
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={ackBusy}
                    onClick={() =>
                      void toggleAck(selected.fingerprint, Boolean(selectedAck))
                    }
                  >
                    {selectedAck ? t("observabilityUnack") : t("observabilityAck")}
                  </Button>
                </div>
              ) : null}
              <p className="text-opseu-gray-dark">{t("observabilityIssueHint")}</p>
            </div>
          ) : null}
        </aside>
      </div>

      <section className="mt-8 space-y-3 rounded-lg border border-opseu-gray-light bg-white p-4">
        <h2 className="text-lg font-semibold text-opseu-dark">
          {t("observabilityAlertsTitle")}
        </h2>
        <p className="text-sm text-opseu-gray-dark">{t("observabilityAlertsNote")}</p>
        {!alertsAvailable ? (
          <Callout tone="warning">{t("observabilityAcksRequirePostgres")}</Callout>
        ) : alertsMeta && !alertsMeta.enabled ? (
          <Callout tone="warning">{t("observabilityAlertsDisabled")}</Callout>
        ) : null}
        {alertsAvailable ? (
          <>
            {alertRules.length === 0 ? (
              <p className="text-sm text-opseu-gray-dark">
                {t("observabilityAlertsEmpty")}
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {alertRules.map((rule) => (
                  <li
                    key={rule.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-opseu-gray-light px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-opseu-dark">
                        {rule.name}{" "}
                        <span className="text-xs font-normal text-opseu-gray-dark">
                          ({rule.minLevel} ≥ {rule.thresholdCount}/
                          {rule.windowMinutes}m · cooldown {rule.cooldownMinutes}
                          m)
                        </span>
                      </p>
                      <p className="text-xs text-opseu-gray-dark">
                        {rule.recipients.join(", ")}
                        {rule.unionId ? ` · union ${rule.unionId}` : ""}
                        {rule.emailFormat === "plain" ? " · plain" : ""}
                        {!rule.enabled ? " · off" : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={ruleBusy}
                      onClick={() => void deleteAlertRule(rule.id)}
                    >
                      {t("observabilityAlertDelete")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label={t("observabilityAlertName")}
                name="ruleName"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
              />
              <Input
                label={t("observabilityAlertThreshold")}
                name="ruleThreshold"
                type="number"
                min={1}
                value={String(ruleThreshold)}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10);
                  if (Number.isFinite(n)) setRuleThreshold(Math.max(1, n));
                }}
              />
              <Input
                label={t("observabilityAlertWindow")}
                name="ruleWindow"
                type="number"
                min={1}
                value={String(ruleWindow)}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10);
                  if (Number.isFinite(n)) setRuleWindow(Math.max(1, n));
                }}
              />
              <Input
                label={t("observabilityAlertCooldown")}
                name="ruleCooldown"
                type="number"
                min={1}
                value={String(ruleCooldown)}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10);
                  if (Number.isFinite(n)) setRuleCooldown(Math.max(1, n));
                }}
              />
            </div>
            <Input
              label={t("observabilityAlertRecipients")}
              name="ruleRecipients"
              value={ruleRecipients}
              onChange={(e) => setRuleRecipients(e.target.value)}
            />
            <Input
              label={t("observabilityAlertUnionId")}
              name="ruleUnionId"
              value={ruleUnionId}
              onChange={(e) => setRuleUnionId(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm text-opseu-gray-dark">
              <input
                type="checkbox"
                checked={rulePlain}
                onChange={(e) => setRulePlain(e.target.checked)}
              />
              {t("observabilityAlertPlain")}
            </label>
            <Button
              type="button"
              variant="primary"
              disabled={ruleBusy}
              onClick={() => void createAlertRule()}
            >
              {t("observabilityAlertCreate")}
            </Button>
          </>
        ) : null}
      </section>
    </>
  );
}
