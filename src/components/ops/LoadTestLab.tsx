"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LabsNav } from "@/components/ops/LabsNav";
import {
  CAPACITY_TIERS,
  type LoadLabLiveStatus,
  type LoadLabProfile,
  type LoadLabSummary,
  parseSummaryJson,
} from "@/lib/ops/load-lab";
import {
  LOAD_LAB_COPY,
  type LoadLabLocale,
} from "@/lib/ops/load-lab/copy";

const PRESET_KEY = "unionops.load-lab.preset";

type FormState = {
  envName: "local" | "staging" | "production";
  profile: LoadLabProfile;
  vus: number;
  durationSec: number;
  rampSec: number;
  baseUrl: string;
  username: string;
  password: string;
  allowProduction: boolean;
};

const DEFAULT_FORM: FormState = {
  envName: "local",
  profile: "smoke",
  vus: 2,
  durationSec: 20,
  rampSec: 5,
  baseUrl: "",
  username: "",
  password: "",
  allowProduction: false,
};

function loadPreset(): FormState {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    if (!raw) return DEFAULT_FORM;
    const parsed = JSON.parse(raw) as Partial<FormState>;
    return {
      ...DEFAULT_FORM,
      ...parsed,
      password: "",
    };
  } catch {
    return DEFAULT_FORM;
  }
}

function SimpleBars({
  label,
  points,
}: {
  label: string;
  points: { x: string; y: number }[];
}) {
  const max = Math.max(1, ...points.map((p) => p.y));
  return (
    <figure className="mt-4">
      <figcaption className="mb-2 text-sm text-zinc-400">{label}</figcaption>
      <div className="flex h-32 items-end gap-2" role="img" aria-label={label}>
        {points.map((p) => (
          <div key={p.x} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full max-w-[3rem] rounded-t bg-sky-500/80"
              style={{ height: `${Math.max(4, (p.y / max) * 100)}%` }}
              title={`${p.x}: ${p.y}`}
            />
            <span className="text-[10px] text-zinc-500">{p.x}</span>
          </div>
        ))}
      </div>
      <table className="mt-2 w-full text-left text-xs text-zinc-400">
        <caption className="sr-only">{label} data table</caption>
        <thead>
          <tr>
            <th scope="col">VUs</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={`row-${p.x}`}>
              <td>{p.x}</td>
              <td>{p.y}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function LoadTestLab() {
  const [locale, setLocale] = useState<LoadLabLocale>("en");
  const t = LOAD_LAB_COPY[locale];
  const [form, setForm] = useState<FormState>(() =>
    typeof window === "undefined" ? DEFAULT_FORM : loadPreset(),
  );
  const [status, setStatus] = useState<LoadLabLiveStatus | null>(null);
  const [summary, setSummary] = useState<LoadLabSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const { password: _pw, ...rest } = form;
      void _pw;
      localStorage.setItem(PRESET_KEY, JSON.stringify(rest));
    } catch {
      /* private browsing */
    }
  }, [form]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/ops/load-lab", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        setError(t.signInHint);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? `Status ${res.status}`);
        return;
      }
      const data = (await res.json()) as LoadLabLiveStatus;
      setStatus(data);
      if (data.summary) setSummary(data.summary);
      setError(null);
    } catch {
      setError(t.signInHint);
    }
  }, [t.signInHint]);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      void (async () => {
        if (cancelled) return;
        await refresh();
      })();
    };
    tick();
    const id = window.setInterval(tick, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [refresh]);

  const cliCommand = useMemo(() => {
    const parts = [
      `LOAD_LAB_ENABLED=true`,
      form.envName === "production" ? `ALLOW_PRODUCTION_LOAD_TEST=true` : "",
      `npm run test:load:${form.profile === "hub-read" ? "hub-read" : form.profile}`,
      form.baseUrl ? `BASE_URL=${form.baseUrl}` : "",
      `TEST_ENV=${form.envName}`,
      form.vus ? `LOAD_VUS=${form.vus}` : "",
      `LOAD_DURATION=${form.durationSec}`,
    ].filter(Boolean);
    return parts.join(" ");
  }, [form]);

  async function onStart() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/load-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: form.profile,
          envName: form.envName,
          baseUrl: form.baseUrl || undefined,
          vus: form.profile === "capacity" ? undefined : form.vus,
          durationSec: form.durationSec,
          rampSec: form.rampSec,
          username: form.username || undefined,
          password: form.password || undefined,
          allowProduction: form.allowProduction,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof body.error === "string" ? body.error : `Start failed (${res.status})`,
        );
        return;
      }
      setStatus(body as LoadLabLiveStatus);
    } finally {
      setBusy(false);
    }
  }

  async function onAbort() {
    setBusy(true);
    try {
      const res = await fetch("/api/ops/load-lab/abort", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof body.error === "string" ? body.error : `Abort failed (${res.status})`,
        );
        return;
      }
      setStatus(body as LoadLabLiveStatus);
    } finally {
      setBusy(false);
    }
  }

  async function onImportFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      const parsed = parseSummaryJson(json);
      if (!parsed) {
        setError("Invalid summary.json (schemaVersion 1 required).");
        return;
      }
      const res = await fetch("/api/ops/load-lab/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) {
        // Still show locally if API rejects (e.g. not signed in).
        setSummary(parsed);
        setError(
          res.status === 401 || res.status === 403
            ? "Imported locally only — sign in as platform_admin to store on server."
            : "Import API failed; showing file locally.",
        );
        return;
      }
      setSummary(parsed);
    } catch {
      setError("Could not read that file as JSON.");
    }
  }

  const attempted =
    summary?.tiers.filter((tier) => tier.verdict !== "not_attempted") ?? [];

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <LabsNav active="load-test" />

        <header className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
            <div className="flex gap-2" role="group" aria-label="Language">
              {(["en", "fr"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  className={
                    locale === code
                      ? "rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-900"
                      : "rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
                  }
                  onClick={() => setLocale(code)}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">
            {t.subtitle}
          </p>
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {t.offHours}
          </p>
          <p className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
            {t.safetyHarness}
          </p>
          {status && !status.enabled ? (
            <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              {t.disabled}
            </p>
          ) : null}
          {form.envName === "production" ? (
            <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              {t.productionBanner}
            </p>
          ) : null}
        </header>

        {error ? (
          <p className="rounded-md border border-rose-500/50 bg-rose-950/50 px-3 py-2 text-sm text-rose-100" role="alert">
            {error}
          </p>
        ) : null}

        <section className="grid gap-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-zinc-400">{t.environment}</span>
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
              value={form.envName}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  envName: e.target.value as FormState["envName"],
                }))
              }
            >
              {(["local", "staging", "production"] as const).map((env) => (
                <option key={env} value={env}>
                  {t.envs[env]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-zinc-400">{t.profile}</span>
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
              value={form.profile}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  profile: e.target.value as LoadLabProfile,
                }))
              }
            >
              {(["smoke", "public", "hub-read", "capacity"] as const).map(
                (p) => (
                  <option key={p} value={p}>
                    {t.profiles[p]}
                  </option>
                ),
              )}
            </select>
          </label>

          {form.profile !== "capacity" ? (
            <label className="block text-sm">
              <span className="text-zinc-400">{t.vus}</span>
              <input
                type="number"
                min={1}
                max={1000}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={form.vus}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vus: Number(e.target.value) || 1 }))
                }
              />
              <span className="mt-1 block text-xs text-zinc-500">
                {t.metricHelpVu}
              </span>
            </label>
          ) : (
            <p className="text-sm text-zinc-400">
              Capacity tiers: {CAPACITY_TIERS.join(" → ")}
            </p>
          )}

          <label className="block text-sm">
            <span className="text-zinc-400">{t.duration}</span>
            <input
              type="number"
              min={5}
              max={900}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
              value={form.durationSec}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  durationSec: Number(e.target.value) || 20,
                }))
              }
            />
          </label>

          <label className="block text-sm">
            <span className="text-zinc-400">{t.ramp}</span>
            <input
              type="number"
              min={0}
              max={300}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
              value={form.rampSec}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  rampSec: Number(e.target.value) || 0,
                }))
              }
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="text-zinc-400">{t.baseUrl}</span>
            <input
              type="url"
              placeholder="http://127.0.0.1:3000"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
              value={form.baseUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, baseUrl: e.target.value }))
              }
            />
            <span className="mt-1 block text-xs text-zinc-500">
              {t.baseUrlHint}
            </span>
          </label>

          {(form.profile === "hub-read" || form.profile === "capacity") && (
            <>
              <label className="block text-sm">
                <span className="text-zinc-400">{t.username}</span>
                <input
                  type="email"
                  autoComplete="username"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value }))
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-400">{t.password}</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
              </label>
            </>
          )}

          {form.envName === "production" ? (
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.allowProduction}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    allowProduction: e.target.checked,
                  }))
                }
              />
              <span>{t.allowProduction}</span>
            </label>
          ) : null}

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="button"
              disabled={
                busy ||
                status?.enabled === false ||
                (status?.cooldownRemainingSec ?? 0) > 0 ||
                status?.status === "running" ||
                status?.status === "starting" ||
                status?.status === "aborting"
              }
              onClick={() => void onStart()}
              className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-40"
            >
              {t.start}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onAbort()}
              className="rounded-md border border-zinc-600 px-4 py-2 text-sm text-zinc-200 disabled:opacity-40"
            >
              {t.abort}
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-md border border-zinc-600 px-4 py-2 text-sm text-zinc-200"
            >
              {t.refresh}
            </button>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(cliCommand);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded-md border border-zinc-600 px-4 py-2 text-sm text-zinc-200"
            >
              {copied ? "Copied" : t.copyCommand}
            </button>
            <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-600 px-4 py-2 text-sm text-zinc-200">
              {t.importLabel}
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onImportFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          <p className="sm:col-span-2 break-all rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-500">
            {cliCommand}
          </p>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="text-lg font-medium">{t.status}</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">State</dt>
              <dd>{status?.status ?? "…"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Message</dt>
              <dd>{status?.message ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Target</dt>
              <dd className="break-all">{status?.baseUrl ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Current VUs</dt>
              <dd>{status?.currentVus ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">{t.cooldownWait}</dt>
              <dd>
                {(status?.cooldownRemainingSec ?? 0) > 0
                  ? `${status?.cooldownRemainingSec}s`
                  : "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">{t.capsLabel}</dt>
              <dd className="font-mono text-xs text-zinc-400">
                {status?.caps
                  ? `maxVUs=${status.caps.maxVus} · maxDuration=${status.caps.maxDurationSec}s · maxRun=${status.caps.maxRunSec}s · cooldown=${status.caps.cooldownSec}s`
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>

        {summary ? (
          <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="text-lg font-medium">{t.capacityHeadline}</h2>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              On-box capacity (generator co-located)
            </p>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded border border-zinc-800 p-3">
                <dt className="text-xs text-zinc-500">{t.lastHealthy}</dt>
                <dd className="text-2xl font-semibold">
                  {summary.lastHealthyVus ?? t.none}
                </dd>
              </div>
              <div className="rounded border border-zinc-800 p-3">
                <dt className="text-xs text-zinc-500">{t.firstDegraded}</dt>
                <dd className="text-2xl font-semibold">
                  {summary.firstDegradedVus ?? t.none}
                </dd>
              </div>
              <div className="rounded border border-zinc-800 p-3">
                <dt className="text-xs text-zinc-500">{t.firstFailed}</dt>
                <dd className="text-2xl font-semibold">
                  {summary.firstFailedVus ?? t.none}
                </dd>
              </div>
              <div className="rounded border border-zinc-800 p-3">
                <dt className="text-xs text-zinc-500">{t.sustainableRps}</dt>
                <dd className="text-2xl font-semibold">
                  {summary.sustainableReqPerSec?.toFixed(1) ?? t.none}
                </dd>
                <p className="mt-1 text-xs text-zinc-500">{t.metricHelpRps}</p>
              </div>
            </dl>

            <h3 className="text-base font-medium">{t.tierTable}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="text-zinc-400">
                  <tr>
                    <th scope="col" className="py-2 pr-3">
                      VUs
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      Req/s
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      p50
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      p95
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      p99
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      Errors
                    </th>
                    <th scope="col" className="py-2">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.tiers.map((tier) => (
                    <tr key={tier.vus} className="border-t border-zinc-800">
                      <td className="py-2 pr-3">{tier.vus}</td>
                      <td className="py-2 pr-3">
                        {tier.verdict === "not_attempted"
                          ? "—"
                          : tier.reqPerSec.toFixed(1)}
                      </td>
                      <td className="py-2 pr-3">
                        {tier.verdict === "not_attempted"
                          ? "—"
                          : `${Math.round(tier.p50Ms)} ms`}
                      </td>
                      <td className="py-2 pr-3">
                        {tier.verdict === "not_attempted"
                          ? "—"
                          : `${Math.round(tier.p95Ms)} ms`}
                      </td>
                      <td className="py-2 pr-3">
                        {tier.verdict === "not_attempted"
                          ? "—"
                          : `${Math.round(tier.p99Ms)} ms`}
                      </td>
                      <td className="py-2 pr-3">
                        {tier.verdict === "not_attempted"
                          ? "—"
                          : `${(tier.errorRate * 100).toFixed(2)}%`}
                      </td>
                      <td className="py-2">
                        {tier.verdict}
                        {tier.skipReason ? ` (${tier.skipReason})` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-500">{t.metricHelpP95}</p>

            {attempted.length > 0 ? (
              <>
                <SimpleBars
                  label="Concurrency vs p95 (ms)"
                  points={attempted.map((tier) => ({
                    x: String(tier.vus),
                    y: Math.round(tier.p95Ms),
                  }))}
                />
                <SimpleBars
                  label="Concurrency vs req/s"
                  points={attempted.map((tier) => ({
                    x: String(tier.vus),
                    y: Number(tier.reqPerSec.toFixed(1)),
                  }))}
                />
                <SimpleBars
                  label="Concurrency vs error %"
                  points={attempted.map((tier) => ({
                    x: String(tier.vus),
                    y: Number((tier.errorRate * 100).toFixed(2)),
                  }))}
                />
              </>
            ) : null}

            <h3 className="text-base font-medium">{t.hints}</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-300">
              {summary.hints.map((h) => (
                <li key={h.id}>
                  <strong className="text-zinc-100">{h.label}.</strong>{" "}
                  {h.detail}
                </li>
              ))}
            </ul>

            <h3 className="text-base font-medium">{t.endpoints}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="text-zinc-400">
                  <tr>
                    <th scope="col" className="py-2 pr-3">
                      Name
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      Count
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      Error %
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      p95
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(summary.tiers[summary.tiers.length - 1]?.endpoints ?? [])
                    .slice()
                    .sort((a, b) => b.p95Ms - a.p95Ms)
                    .slice(0, 12)
                    .map((ep) => (
                      <tr key={ep.name} className="border-t border-zinc-800">
                        <td className="py-2 pr-3">{ep.name}</td>
                        <td className="py-2 pr-3">{ep.count}</td>
                        <td className="py-2 pr-3">
                          {(ep.errorRate * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 pr-3">
                          {Math.round(ep.p95Ms)} ms
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
