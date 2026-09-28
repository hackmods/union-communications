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
import {
  assertAllowedTargetUrl,
  createRollingStats,
  filterCapacityTiers,
  midTierShouldAbort,
  recordSample,
  type RollingStats,
} from "./safety";
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

type Collectors = {
  global: RollingStats;
  byName: Map<string, RollingStats>;
};

function createCollectors(): Collectors {
  return { global: createRollingStats(), byName: new Map() };
}

function pushSample(collectors: Collectors, sample: Sample): void {
  recordSample(collectors.global, sample);
  let ep = collectors.byName.get(sample.name);
  if (!ep) {
    ep = createRollingStats();
    collectors.byName.set(sample.name, ep);
  }
  recordSample(ep, sample);
}

function aggregateCollectors(
  collectors: Collectors,
  vus: number,
  wallSec: number,
): Omit<TierResult, "verdict" | "skipReason"> {
  const endpoints: EndpointStats[] = [...collectors.byName.entries()].map(
    ([name, stats]) => {
      const times = [...stats.latenciesMs].sort((a, b) => a - b);
      return {
        name,
        count: stats.count,
        errors: stats.errors,
        errorRate: stats.count ? stats.errors / stats.count : 0,
        p50Ms: percentile(times, 50),
        p95Ms: percentile(times, 95),
        p99Ms: percentile(times, 99),
      };
    },
  );

  const times = [...collectors.global.latenciesMs].sort((a, b) => a - b);
  const failed = collectors.global.errors;
  const successful = collectors.global.count - failed;
  const errorRate = collectors.global.count
    ? failed / collectors.global.count
    : 1;

  return {
    vus,
    reqPerSec: wallSec > 0 ? collectors.global.count / wallSec : 0,
    iterations: collectors.global.count,
    successful,
    failed,
    errorRate,
    p50Ms: percentile(times, 50),
    p95Ms: percentile(times, 95),
    p99Ms: percentile(times, 99),
    maxMs: times.length ? times[times.length - 1]! : 0,
    authFailures: collectors.global.authFailures,
    timeouts: collectors.global.timeouts,
    endpoints,
  };
}

function emptySkippedTier(
  vus: number,
  reason: string,
): TierResult {
  return {
    vus,
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
    skipReason: reason,
  };
}

async function runVuWorker(options: {
  baseUrl: string;
  profile: LoadLabProfile;
  jar: CookieJar;
  until: number;
  signal: AbortSignal;
  collectors: Collectors;
  midAbort: { tripped: boolean; reason?: string };
}): Promise<void> {
  while (
    Date.now() < options.until &&
    !options.signal.aborted &&
    !options.midAbort.tripped
  ) {
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
      for (const sample of batch) {
        pushSample(options.collectors, sample);
      }
      const check = midTierShouldAbort(
        options.collectors.global,
        ABORT_ERROR_RATE,
        ABORT_P95_MS,
        percentile,
      );
      if (check.abort) {
        options.midAbort.tripped = true;
        options.midAbort.reason = check.reason;
        break;
      }
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

/** Cap concurrent Auth.js logins so capacity does not DoS the auth path. */
const MAX_AUTH_SESSIONS = 8;

async function buildSessionPool(
  baseUrl: string,
  credentials: LoadCredentials,
  vus: number,
  signal: AbortSignal,
  collectors: Collectors,
): Promise<CookieJar[]> {
  const poolSize = Math.min(MAX_AUTH_SESSIONS, Math.max(1, vus));
  const jars: CookieJar[] = [];
  for (let i = 0; i < poolSize; i++) {
    if (signal.aborted) break;
    const session = await ensureHubSession(baseUrl, credentials, signal);
    for (const s of session.samples) pushSample(collectors, s);
    jars.push(session.jar);
    // Small stagger between logins.
    try {
      await sleep(50 + Math.floor(Math.random() * 100), signal);
    } catch {
      break;
    }
  }
  if (jars.length === 0) {
    jars.push(new Map());
  }
  return jars;
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
  const collectors = createCollectors();
  const workers: Promise<void>[] = [];
  const midAbort = { tripped: false, reason: undefined as string | undefined };
  const started = Date.now();
  const rampMs = Math.max(0, options.rampSec) * 1000;
  const steadyMs = Math.max(5, options.durationSec) * 1000;
  const until = started + rampMs + steadyMs;

  options.onProgress?.({
    message: `Tier ${options.vus} VUs — ramping`,
    currentVus: options.vus,
    currentTierIndex: options.tierIndex,
  });

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

  if (needsAuth && !options.credentials) {
    return {
      ...aggregateCollectors(collectors, options.vus, 0.001),
      verdict: "failed",
      skipReason: "missing credentials",
    };
  }

  let sessionPool: CookieJar[] = [new Map()];
  if (needsAuth && options.credentials) {
    sessionPool = await buildSessionPool(
      options.baseUrl,
      options.credentials,
      options.vus,
      options.signal,
      collectors,
    );
  }

  for (let i = 0; i < options.vus; i++) {
    if (options.signal.aborted || midAbort.tripped) break;
    const jar = new Map(sessionPool[i % sessionPool.length]);

    workers.push(
      runVuWorker({
        baseUrl: options.baseUrl,
        profile: workerProfile,
        jar,
        until,
        signal: options.signal,
        collectors,
        midAbort,
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
    message: midAbort.tripped
      ? `Tier ${options.vus} VUs — mid-tier abort`
      : `Tier ${options.vus} VUs — steady state`,
    currentVus: options.vus,
    currentTierIndex: options.tierIndex,
  });

  await Promise.all(workers);
  const wallSec = Math.max(0.001, (Date.now() - started) / 1000);
  const agg = aggregateCollectors(collectors, options.vus, wallSec);
  if (midAbort.tripped) {
    return {
      ...agg,
      verdict: "failed",
      skipReason: midAbort.reason,
    };
  }
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

  const targetGate = assertAllowedTargetUrl(baseUrl, env);
  if (!targetGate.ok) {
    throw new Error(targetGate.error);
  }

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

  let vuList: number[];
  if (request.profile === "capacity") {
    const filtered = filterCapacityTiers(CAPACITY_TIERS, maxVus);
    vuList = filtered.run;
    for (const skipped of filtered.skipped) {
      tiers.push(
        emptySkippedTier(
          skipped,
          `above LOAD_LAB_MAX_VUS (${maxVus})`,
        ),
      );
    }
  } else {
    vuList = [
      Math.min(
        maxVus,
        Math.max(
          1,
          request.vus ??
            (request.profile === "smoke" ? DEFAULT_SMOKE_VUS : 50),
        ),
      ),
    ];
  }

  for (let i = 0; i < vuList.length; i++) {
    const vus = vuList[i]!;
    if (options.signal.aborted) {
      aborted = true;
      abortReason = abortReason ?? "operator abort";
      for (let j = i; j < vuList.length; j++) {
        tiers.push(emptySkippedTier(vuList[j]!, abortReason));
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

    const severe =
      tier.errorRate >= ABORT_ERROR_RATE ||
      tier.p95Ms >= ABORT_P95_MS ||
      Boolean(tier.skipReason?.startsWith("mid-tier"));
    const stopEscalation =
      request.profile === "capacity" &&
      i < vuList.length - 1 &&
      (severe || tier.verdict === "failed");

    if (stopEscalation) {
      aborted = true;
      abortReason =
        tier.skipReason ??
        (tier.errorRate >= ABORT_ERROR_RATE
          ? `error rate ${(tier.errorRate * 100).toFixed(1)}% ≥ ${ABORT_ERROR_RATE * 100}%`
          : tier.verdict === "failed"
            ? `tier failed thresholds at ${vus} VUs`
            : `p95 ${Math.round(tier.p95Ms)}ms ≥ ${ABORT_P95_MS}ms`);
      for (let j = i + 1; j < vuList.length; j++) {
        tiers.push(emptySkippedTier(vuList[j]!, abortReason));
      }
      break;
    }
  }

  // Keep skipped-above-cap tiers at the end in VU order for the table.
  tiers.sort((a, b) => a.vus - b.vus);

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
      "Safety: target allowlist, VU/duration/run wall-clock caps, mid-tier circuit breaker, bounded samples, auth session pool.",
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
