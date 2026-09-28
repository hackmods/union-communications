/**
 * In-process singleton for on-box Load Lab runs (single CapRover instance).
 */

import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { buildHealthStatus } from "@/lib/ops/health-status";
import { auditLog } from "@/lib/audit/store";
import {
  assertProductionInterlock,
  isLoadLabEnabled,
  isProductionLoadAllowed,
  maxDurationSecCap,
  maxVusCap,
  profileNeedsAuth,
  resolveBaseUrl,
} from "./env";
import { parseSummaryJson } from "./report";
import { executeLoadRun } from "./runner";
import {
  assertAllowedTargetUrl,
  maxRunWallClockSec,
} from "./safety";
import type {
  LoadLabLiveStatus,
  LoadLabStartRequest,
  LoadLabSummary,
} from "./types";

type InternalState = {
  status: LoadLabLiveStatus["status"];
  runId: string | null;
  profile: LoadLabStartRequest["profile"] | null;
  envName: LoadLabStartRequest["envName"] | null;
  baseUrl: string | null;
  currentVus: number | null;
  currentTierIndex: number | null;
  message: string;
  startedAt: string | null;
  summary: LoadLabSummary | null;
  abort: AbortController | null;
  wallClockTimer: ReturnType<typeof setTimeout> | null;
  actorId: string | null;
};

const state: InternalState = {
  status: "idle",
  runId: null,
  profile: null,
  envName: null,
  baseUrl: null,
  currentVus: null,
  currentTierIndex: null,
  message: "Idle",
  startedAt: null,
  summary: null,
  abort: null,
  wallClockTimer: null,
  actorId: null,
};

export function getLoadLabStatus(
  env: NodeJS.ProcessEnv = process.env,
): LoadLabLiveStatus {
  return {
    status: state.status,
    runId: state.runId,
    profile: state.profile,
    envName: state.envName,
    baseUrl: state.baseUrl,
    currentVus: state.currentVus,
    currentTierIndex: state.currentTierIndex,
    message: state.message,
    startedAt: state.startedAt,
    summary: state.summary,
    enabled: isLoadLabEnabled(env),
    productionAllowed: isProductionLoadAllowed(env),
  };
}

export async function startLoadLabRun(
  request: LoadLabStartRequest,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ ok: true; status: LoadLabLiveStatus } | { ok: false; status: number; error: string }> {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return { ok: false, status: gate.status, error: gate.error };
  }

  const interlock = assertProductionInterlock({
    envName: request.envName,
    allowProduction: request.allowProduction,
    env,
  });
  if (!interlock.ok) {
    return { ok: false, status: 403, error: interlock.error };
  }

  if (state.status === "running" || state.status === "starting") {
    return { ok: false, status: 409, error: "A load test is already running." };
  }

  if (profileNeedsAuth(request.profile)) {
    if (!request.username?.trim() || !request.password) {
      return {
        ok: false,
        status: 400,
        error: "Hub profiles require username and password for load-test accounts.",
      };
    }
  }

  const vusCap = maxVusCap(env);
  if (request.vus != null && request.vus > vusCap) {
    return {
      ok: false,
      status: 400,
      error: `VU count exceeds LOAD_LAB_MAX_VUS (${vusCap}).`,
    };
  }
  const durCap = maxDurationSecCap(env);
  if (request.durationSec != null && request.durationSec > durCap) {
    return {
      ok: false,
      status: 400,
      error: `Duration exceeds LOAD_LAB_MAX_DURATION_SEC (${durCap}).`,
    };
  }

  const baseUrl = resolveBaseUrl({
    envName: request.envName,
    override: request.baseUrl,
    preferLoopback: true,
    env,
  });

  const targetGate = assertAllowedTargetUrl(baseUrl, env);
  if (!targetGate.ok) {
    return { ok: false, status: 400, error: targetGate.error };
  }

  const ac = new AbortController();
  const wallSec = maxRunWallClockSec(env);
  const wallClockTimer = setTimeout(() => {
    if (state.abort === ac && !ac.signal.aborted) {
      state.message = `Wall-clock limit (${wallSec}s) reached — aborting.`;
      state.status = "aborting";
      ac.abort();
    }
  }, wallSec * 1000);
  // Do not keep the event loop alive solely for the safety timer.
  wallClockTimer.unref?.();

  state.status = "starting";
  state.abort = ac;
  state.wallClockTimer = wallClockTimer;
  state.summary = null;
  state.profile = request.profile;
  state.envName = request.envName;
  state.baseUrl = baseUrl;
  state.startedAt = new Date().toISOString();
  state.currentVus = null;
  state.currentTierIndex = null;
  state.message = "Starting…";
  state.actorId = gate.session.user.id;
  state.runId = null;

  await auditLog.log({
    userId: gate.session.user.id,
    action: "load_lab.start",
    resourceType: "load_lab",
    resourceId: request.profile,
    unionId: gate.session.user.unionId,
    localId: gate.session.user.localId,
    metadata: {
      profile: request.profile,
      envName: request.envName,
      baseUrl,
      vus: String(request.vus ?? ""),
      durationSec: String(request.durationSec ?? ""),
    },
  });

  const credentials =
    request.username && request.password
      ? { username: request.username.trim(), password: request.password }
      : undefined;

  void (async () => {
    state.status = "running";
    try {
      let commit: string | undefined;
      let version: string | undefined;
      try {
        const health = await buildHealthStatus();
        commit = health.commit;
        version = health.version;
      } catch {
        /* optional */
      }

      const summary = await executeLoadRun(request, {
        signal: ac.signal,
        credentials,
        commit,
        version,
        preferLoopback: true,
        env,
        onProgress: (p) => {
          state.message = p.message;
          state.currentVus = p.currentVus;
          state.currentTierIndex = p.currentTierIndex;
        },
      });
      state.runId = summary.runId;
      state.summary = summary;
      state.status = "completed";
      state.message = summary.aborted
        ? `Completed with abort: ${summary.abortReason}`
        : "Completed";
      await auditLog.log({
        userId: gate.session.user.id,
        action: "load_lab.finish",
        resourceType: "load_lab",
        resourceId: summary.runId,
        unionId: gate.session.user.unionId,
        localId: gate.session.user.localId,
        metadata: {
          aborted: summary.aborted ? "true" : "false",
          lastHealthyVus: String(summary.lastHealthyVus ?? ""),
          firstFailedVus: String(summary.firstFailedVus ?? ""),
        },
      });
    } catch (err) {
      state.status = "failed";
      state.message =
        err instanceof Error ? err.message : "Load run failed unexpectedly.";
      await auditLog.log({
        userId: gate.session.user.id,
        action: "load_lab.fail",
        resourceType: "load_lab",
        resourceId: state.profile ?? "unknown",
        unionId: gate.session.user.unionId,
        localId: gate.session.user.localId,
        outcome: "error",
        metadata: { message: state.message },
      });
    } finally {
      if (state.wallClockTimer) {
        clearTimeout(state.wallClockTimer);
        state.wallClockTimer = null;
      }
      state.abort = null;
      state.currentVus = null;
    }
  })();

  return { ok: true, status: getLoadLabStatus(env) };
}

export async function abortLoadLabRun(
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ ok: true; status: LoadLabLiveStatus } | { ok: false; status: number; error: string }> {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return { ok: false, status: gate.status, error: gate.error };
  }
  if (!isLoadLabEnabled(env)) {
    return { ok: false, status: 403, error: "Load Lab is disabled." };
  }
  if (!state.abort || (state.status !== "running" && state.status !== "starting")) {
    return { ok: false, status: 409, error: "No running load test to abort." };
  }
  state.status = "aborting";
  state.message = "Aborting…";
  state.abort.abort();
  if (state.wallClockTimer) {
    clearTimeout(state.wallClockTimer);
    state.wallClockTimer = null;
  }
  await auditLog.log({
    userId: gate.session.user.id,
    action: "load_lab.abort",
    resourceType: "load_lab",
    resourceId: state.runId ?? state.profile ?? "unknown",
    unionId: gate.session.user.unionId,
    localId: gate.session.user.localId,
  });
  return { ok: true, status: getLoadLabStatus(env) };
}

export function importLoadLabSummary(raw: unknown): LoadLabSummary | null {
  const parsed = parseSummaryJson(raw);
  if (!parsed) return null;
  state.summary = parsed;
  state.runId = parsed.runId;
  state.profile = parsed.profile;
  state.envName = parsed.envName;
  state.baseUrl = parsed.baseUrl;
  state.status = "completed";
  state.message = "Imported summary";
  state.startedAt = parsed.startedAt;
  return parsed;
}

/** Test-only reset. */
export function resetLoadLabStateForTests(): void {
  state.abort?.abort();
  if (state.wallClockTimer) {
    clearTimeout(state.wallClockTimer);
    state.wallClockTimer = null;
  }
  state.status = "idle";
  state.runId = null;
  state.profile = null;
  state.envName = null;
  state.baseUrl = null;
  state.currentVus = null;
  state.currentTierIndex = null;
  state.message = "Idle";
  state.startedAt = null;
  state.summary = null;
  state.abort = null;
  state.actorId = null;
}
