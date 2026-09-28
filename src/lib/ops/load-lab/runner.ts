import { randomUUID } from "node:crypto";
import type { LoadCredentials } from "./auth";
import {
  ABORT_ERROR_RATE,
  ABORT_P95_MS,
  CAPACITY_TIERS,
  DEFAULT_DURATION_SEC,
  DEFAULT_RAMP_SEC,
  DEFAULT_SMOKE_DURATION_SEC,
  DEFAULT_SMOKE_VUS,
  maxDurationSecCap,
  maxVusCap,
  resolveBaseUrl,
} from "./env";
import {
  ensureHubSession,
  runHubReadIteration,
  runPublicIteration,
} from "./flows";
import { sleep, type CookieJar } from "./http";
import { buildBottleneckHints, summarizeCapacity } from "./hints";
import { writeSummary } from "./report";
import { classifyTier, percentile } from "./thresholds";
import type {
  EndpointStats,
  LoadLabEnvName,
  LoadLabProfile,
  LoadLabStartRequest,
  LoadLabSummary,
  Sample,
  TierResult,
} from "./types";

export type RunProgress = {
  message: string;
  currentVus: number | null;
  currentTierIndex: number | null;
};

export type ExecuteOptions = {
  signal: AbortSignal;
  onProgress?: (p: RunProgress) => void;
  credentials?: LoadCredentials;
  commit?: string;
  version?: string;
  preferLoopback?: boolean;
  env?: NodeJS.ProcessEnv;
};

function aggregateSamples(
  samples: Sample[],
  vus: number,
  wallSec: number,
): Omit<TierResult, "verdict" | "skipReason"> {
  const byName = new Map<string, Sample[]>();
  for (const s of samples) {
    const list = byName.get(s.name) ?? [];
    list.push(s);
    byName.set(s.name, list);
  }

  const endpoints: EndpointStats[] = [...byName.entries()].map(
    ([name, list]) => {
      const times = list.map((x) => x.ms).sort((a, b) => a - b);
      const errors = list.filter((x) => !x.ok).length;
      return {
        name,
        count: list.length,
        errors,
        errorRate: list.length ? errors / list.length : 0,
        p50Ms: percentile(times, 50),
        p95Ms: percentile(times, 95),
        p99Ms: percentile(times, 99),
      };
    },
  );

  const times = samples.map((s) => s.ms).sort((a, b) => a - b);
  const failed = samples.filter((s) => !s.ok).length;
  const successful = samples.length - failed;
  const errorRate = samples.length ? failed / samples.length : 1;
  const authFailures = samples.filter((s) => s.authFailure).length;
  const timeouts = samples.filter((s) => s.timeout).length;

  return {
    vus,
    reqPerSec: wallSec > 0 ? samples.length / wallSec : 0,
    iterations: samples.length,
    successful,
    failed,
    errorRate,
    p50Ms: percentile(times, 50),
    p95Ms: percentile(times, 95),
    p99Ms: percentile(times, 99),
    maxMs: times.length ? times[times.length - 1]! : 0,
    authFailures,
    timeouts,
    endpoints,
  };
}

async function runVuWorker(options: {
  baseUrl: string;
  profile: LoadLabProfile;
  jar: CookieJar;
  until: number;
  signal: AbortSignal;
  collect: Sample[];
}): Promise<void> {
  while (Date.now() < options.until && !options.signal.aborted) {
    try {
      const batch =
        options.profile === "public" || options.profile === "smoke"
          ? await runPublicIteration(
              options.baseUrl,
              options.jar,
              options.signal,
            )
          : await runHubReadIteration(
              options.baseUrl,
              options.jar,
              options.signal,
            );
      options.collect.push(...batch);
    } catch {
      if (options.signal.aborted) break;
    }
    try {
      await sleep(100 + Math.floor(Math.random() * 400), options.signal);
    } catch {
      break;
    }
  }
}

async function runTier(options: {
  baseUrl: string;
  profile: LoadLabProfile;
  vus: number;
  rampSec: number;
  durationSec: number;
  signal: AbortSignal;
  credentials?: LoadCredentials;
  onProgress?: (p: RunProgress) => void;
  tierIndex: number;
}): Promise<TierResult> {
  const collect: Sample[] = [];
  const workers: Promise<void>[] = [];
  const started = Date.now();
  const rampMs = Math.max(0, options.rampSec) * 1000;
  const steadyMs = Math.max(5, options.durationSec) * 1000;
  const until = started + rampMs + steadyMs;

  options.onProgress?.({
    message: `Tier ${options.vus} VUs — ramping`,
    currentVus: options.vus,
    currentTierIndex: options.tierIndex,
  });

  for (let i = 0; i < options.vus; i++) {
    if (options.signal.aborted) break;
    const jar: CookieJar = new Map();
    const needsAuth =
      options.profile === "hub-read" ||
      (options.profile === "capacity" && Boolean(options.credentials));
    const workerProfile: LoadLabProfile =
      options.profile === "smoke"
        ? "public"
        : options.profile === "capacity"
          ? needsAuth
            ? "hub-read"
            : "public"
          : options.profile;

    if (needsAuth) {
      if (!options.credentials) {
        return {
          ...aggregateSamples([], options.vus, 0.001),
          verdict: "failed",
          skipReason: "missing credentials",
        };
      }
      const session = await ensureHubSession(
        options.baseUrl,
        options.credentials,
        options.signal,
      );
      collect.push(...session.samples);
      for (const [k, v] of session.jar) jar.set(k, v);
    }

    workers.push(
      runVuWorker({
        baseUrl: options.baseUrl,
        profile: workerProfile,
        jar,
        until,
        signal: options.signal,
        collect,
      }),
    );

    if (rampMs > 0 && options.vus > 1) {
      const stagger = rampMs / options.vus;
      try {
        await sleep(stagger, options.signal);
      } catch {
        break;
      }
    }
  }

  options.onProgress?.({
    message: `Tier ${options.vus} VUs — steady state`,
    currentVus: options.vus,
    currentTierIndex: options.tierIndex,
  });

  await Promise.all(workers);
  const wallSec = Math.max(0.001, (Date.now() - started) / 1000);
  const agg = aggregateSamples(collect, options.vus, wallSec);
  const verdict = classifyTier(agg.errorRate, agg.p95Ms);
  return { ...agg, verdict };
}

export async function executeLoadRun(
  request: LoadLabStartRequest,
  options: ExecuteOptions,
): Promise<LoadLabSummary> {
  const env = options.env ?? process.env;
  const baseUrl = resolveBaseUrl({
    envName: request.envName,
    override: request.baseUrl,
    preferLoopback:
      options.preferLoopback ??
      (request.envName === "local" || request.envName === "production"),
    env,
  });

  const maxVus = maxVusCap(env);
  const maxDur = maxDurationSecCap(env);
  const durationSec = Math.min(
    maxDur,
    Math.max(
      5,
      request.durationSec ??
        (request.profile === "smoke"
          ? DEFAULT_SMOKE_DURATION_SEC
          : DEFAULT_DURATION_SEC),
    ),
  );
  const rampSec = Math.min(
    120,
    Math.max(0, request.rampSec ?? DEFAULT_RAMP_SEC),
  );

  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}_${request.profile}_${randomUUID().slice(0, 8)}`;
  const startedAt = new Date().toISOString();
  const tiers: TierResult[] = [];
  let aborted = false;
  let abortReason: string | undefined;

  const vuList: number[] =
    request.profile === "capacity"
      ? [...CAPACITY_TIERS]
      : [
          Math.min(
            maxVus,
            Math.max(
              1,
              request.vus ??
                (request.profile === "smoke" ? DEFAULT_SMOKE_VUS : 50),
            ),
          ),
        ];

  for (let i = 0; i < vuList.length; i++) {
    const vus = Math.min(maxVus, vuList[i]!);
    if (options.signal.aborted) {
      aborted = true;
      abortReason = "operator abort";
      for (let j = i; j < vuList.length; j++) {
        tiers.push({
          vus: vuList[j]!,
          reqPerSec: 0,
          iterations: 0,
          successful: 0,
          failed: 0,
          errorRate: 0,
          p50Ms: 0,
          p95Ms: 0,
          p99Ms: 0,
          maxMs: 0,
          authFailures: 0,
          timeouts: 0,
          endpoints: [],
          verdict: "not_attempted",
          skipReason: abortReason,
        });
      }
      break;
    }

    const tier = await runTier({
      baseUrl,
      profile: request.profile,
      vus,
      rampSec: request.profile === "smoke" ? 0 : rampSec,
      durationSec:
        request.profile === "capacity"
          ? Math.min(durationSec, 90)
          : durationSec,
      signal: options.signal,
      credentials: options.credentials,
      onProgress: options.onProgress,
      tierIndex: i,
    });
    tiers.push(tier);

    if (
      tier.errorRate >= ABORT_ERROR_RATE ||
      tier.p95Ms >= ABORT_P95_MS ||
      tier.verdict === "failed"
    ) {
      const severe =
        tier.errorRate >= ABORT_ERROR_RATE || tier.p95Ms >= ABORT_P95_MS;
      if (severe && request.profile === "capacity" && i < vuList.length - 1) {
        aborted = true;
        abortReason =
          tier.errorRate >= ABORT_ERROR_RATE
            ? `error rate ${(tier.errorRate * 100).toFixed(1)}% ≥ ${ABORT_ERROR_RATE * 100}%`
            : `p95 ${Math.round(tier.p95Ms)}ms ≥ ${ABORT_P95_MS}ms`;
        for (let j = i + 1; j < vuList.length; j++) {
          tiers.push({
            vus: vuList[j]!,
            reqPerSec: 0,
            iterations: 0,
            successful: 0,
            failed: 0,
            errorRate: 0,
            p50Ms: 0,
            p95Ms: 0,
            p99Ms: 0,
            maxMs: 0,
            authFailures: 0,
            timeouts: 0,
            endpoints: [],
            verdict: "not_attempted",
            skipReason: abortReason,
          });
        }
        break;
      }
    }
  }

  const capacity = summarizeCapacity(tiers);
  const finishedAt = new Date().toISOString();
  const draft: LoadLabSummary = {
    schemaVersion: 1,
    measurementMode: "on-box-colocated",
    runId,
    startedAt,
    finishedAt,
    profile: request.profile,
    envName: request.envName,
    baseUrl,
    commit: options.commit,
    version: options.version,
    tiers,
    ...capacity,
    hints: [],
    aborted,
    abortReason,
    notes: [
      "On-box capacity (generator co-located). Not an external-only RPS ceiling.",
      "VU count is concurrent simulated users with think-time — not requests per second.",
    ],
  };
  draft.hints = buildBottleneckHints(draft);

  try {
    await writeSummary(draft, env);
  } catch {
    draft.notes.push("Could not write load-results/ summary files.");
  }

  return draft;
}

export type { LoadLabEnvName };
