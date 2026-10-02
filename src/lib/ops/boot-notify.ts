/**
 * Ops lifecycle emails — deploy (new image) and restart (same image).
 * Env-gated; CapRover App Config only (no Site Admin settings page).
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { auditLog } from "@/lib/audit/store";
import { isPostgresConfigured, getDb } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { opsBootNotifyState } from "@/lib/db/schema/ops-boot-notify";
import { composeOpsLifecycleNotify } from "@/lib/email/engine/compose-ops-lifecycle";
import {
  isTransactionalEmailAvailable,
  sendTransactionalEmail,
} from "@/lib/email/send";
import { autoAckIssuesOnDeploy } from "@/lib/observability/auto-ack-deploy";
import { reportServerError } from "@/lib/observability/report-server-error";

// NOTE: buildDeployNotifyPayload is loaded dynamically to avoid a cycle with deploy-notify.ts
// Do not import health-status here — health-status imports this module for opsLifecycleNotify.

function readLocalAppVersion(): string {
  try {
    const raw = readFileSync(path.join(process.cwd(), "package.json"), "utf8");
    return (
      (JSON.parse(raw) as { version?: string }).version?.trim() || "unknown"
    );
  } catch {
    return "unknown";
  }
}

function readLocalBuildTime(): string {
  const fromEnv = process.env.BUILD_TIME?.trim();
  if (fromEnv) return fromEnv;
  try {
    return (
      readFileSync(path.join(process.cwd(), ".build-time"), "utf8").trim() ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

type EnvLike = Record<string, string | undefined>;

function envTruthy(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function parsePositiveInt(
  raw: string | undefined,
  fallback: number,
): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Deploy-on when OPS_NOTIFY_ON_DEPLOY or legacy DEPLOY_NOTIFY_ENABLED. */
export function isOpsNotifyOnDeploy(env: EnvLike = process.env): boolean {
  return (
    envTruthy(env.OPS_NOTIFY_ON_DEPLOY) ||
    envTruthy(env.DEPLOY_NOTIFY_ENABLED)
  );
}

export function isOpsNotifyOnRestart(env: EnvLike = process.env): boolean {
  return envTruthy(env.OPS_NOTIFY_ON_RESTART);
}

export function readDeployNotifyEmail(env: EnvLike = process.env): string | null {
  const value = env.DEPLOY_NOTIFY_EMAIL?.trim();
  return value || null;
}

export function readRestartCooldownMinutes(env: EnvLike = process.env): number {
  return parsePositiveInt(env.OPS_NOTIFY_RESTART_COOLDOWN_MINUTES, 15);
}

export function readDeployDedupeMinutes(env: EnvLike = process.env): number {
  return parsePositiveInt(env.OPS_NOTIFY_DEPLOY_DEDUPE_MINUTES, 10);
}

export function readBootDelayMs(env: EnvLike = process.env): number {
  return parsePositiveInt(env.OPS_NOTIFY_BOOT_DELAY_MS, 5000);
}

export function readCurrentBuildCommit(env: EnvLike = process.env): string {
  return env.BUILD_COMMIT_SHA?.trim() || "unknown";
}

export function isKnownCommit(commit: string): boolean {
  return Boolean(commit && commit !== "unknown");
}

export type OpsBootNotifyState = {
  lastDeployCommit: string | null;
  lastDeployNotifiedAt: string | null;
  lastRestartNotifiedAt: string | null;
};

export type OpsLifecycleNotifyStateBackend = "postgres" | "file" | "none";

export function resolveOpsNotifyStateBackend(
  env: EnvLike = process.env,
): OpsLifecycleNotifyStateBackend {
  if (isPostgresConfigured(env as NodeJS.ProcessEnv)) return "postgres";
  if (env.OPS_NOTIFY_STATE_PATH?.trim() || env.ERROR_LOG_FILE_PATH?.trim()) {
    return "file";
  }
  return "file";
}

export function resolveOpsNotifyStatePath(env: EnvLike = process.env): string {
  const explicit = env.OPS_NOTIFY_STATE_PATH?.trim();
  if (explicit) return explicit;
  const logPath = env.ERROR_LOG_FILE_PATH?.trim();
  if (logPath) {
    return path.join(path.dirname(logPath), "ops-boot-notify-state.json");
  }
  return path.join("/tmp", "ops-boot-notify-state.json");
}

export function emptyOpsBootNotifyState(): OpsBootNotifyState {
  return {
    lastDeployCommit: null,
    lastDeployNotifiedAt: null,
    lastRestartNotifiedAt: null,
  };
}

function minutesElapsed(iso: string | null, nowMs: number): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return null;
  return (nowMs - then) / 60_000;
}

export type BootNotifyDecision =
  | { action: "deploy" }
  | { action: "restart" }
  | { action: "skip"; reason: string };

/**
 * Pure decision helper for unit tests.
 * Deploy subsumes restart. Unknown commit never claims new image.
 * Same commit within deploy dedupe window → skip (covers boot↔CI race).
 */
export function decideBootNotifyAction(input: {
  commit: string;
  deployOn: boolean;
  restartOn: boolean;
  state: OpsBootNotifyState;
  nowMs?: number;
  restartCooldownMinutes?: number;
  deployDedupeMinutes?: number;
}): BootNotifyDecision {
  const nowMs = input.nowMs ?? Date.now();
  const cooldown = input.restartCooldownMinutes ?? 15;
  const dedupe = input.deployDedupeMinutes ?? 10;
  const known = isKnownCommit(input.commit);

  if (known && input.deployOn) {
    const last = input.state.lastDeployCommit;
    if (last !== input.commit) {
      // New image or first boot — deploy subsumes restart.
      return { action: "deploy" };
    }
    // Same commit already recorded. Within dedupe → skip all (CI may have mailed).
    const elapsed = minutesElapsed(input.state.lastDeployNotifiedAt, nowMs);
    if (elapsed != null && elapsed < dedupe) {
      return { action: "skip", reason: "deploy_dedupe_window" };
    }
  }

  if (!input.restartOn) {
    return { action: "skip", reason: "restart_disabled" };
  }

  const restartElapsed = minutesElapsed(
    input.state.lastRestartNotifiedAt,
    nowMs,
  );
  if (restartElapsed != null && restartElapsed < cooldown) {
    return { action: "skip", reason: "restart_cooldown" };
  }

  return { action: "restart" };
}

async function loadStateFromFile(filePath: string): Promise<OpsBootNotifyState> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<OpsBootNotifyState>;
    return {
      lastDeployCommit: parsed.lastDeployCommit ?? null,
      lastDeployNotifiedAt: parsed.lastDeployNotifiedAt ?? null,
      lastRestartNotifiedAt: parsed.lastRestartNotifiedAt ?? null,
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return emptyOpsBootNotifyState();
    throw error;
  }
}

async function saveStateToFile(
  filePath: string,
  state: OpsBootNotifyState,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function loadStateFromPostgres(): Promise<OpsBootNotifyState> {
  const rows = await getDb()
    .select()
    .from(opsBootNotifyState)
    .limit(1);
  const row = rows[0];
  if (!row) return emptyOpsBootNotifyState();
  return {
    lastDeployCommit: row.lastDeployCommit ?? null,
    lastDeployNotifiedAt: row.lastDeployNotifiedAt
      ? row.lastDeployNotifiedAt.toISOString()
      : null,
    lastRestartNotifiedAt: row.lastRestartNotifiedAt
      ? row.lastRestartNotifiedAt.toISOString()
      : null,
  };
}

async function saveStateToPostgres(state: OpsBootNotifyState): Promise<void> {
  const now = new Date();
  await getDb()
    .insert(opsBootNotifyState)
    .values({
      id: true,
      lastDeployCommit: state.lastDeployCommit,
      lastDeployNotifiedAt: state.lastDeployNotifiedAt
        ? new Date(state.lastDeployNotifiedAt)
        : null,
      lastRestartNotifiedAt: state.lastRestartNotifiedAt
        ? new Date(state.lastRestartNotifiedAt)
        : null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: opsBootNotifyState.id,
      set: {
        lastDeployCommit: state.lastDeployCommit,
        lastDeployNotifiedAt: state.lastDeployNotifiedAt
          ? new Date(state.lastDeployNotifiedAt)
          : null,
        lastRestartNotifiedAt: state.lastRestartNotifiedAt
          ? new Date(state.lastRestartNotifiedAt)
          : null,
        updatedAt: now,
      },
    });
}

export async function loadOpsBootNotifyState(
  env: EnvLike = process.env,
): Promise<OpsBootNotifyState> {
  if (isPostgresConfigured(env as NodeJS.ProcessEnv)) {
    return withRlsContext({ retentionJob: true }, async () => {
      await getDb().execute(
        sql`select pg_advisory_xact_lock(hashtextextended('ops-boot-notify', 0))`,
      );
      return loadStateFromPostgres();
    });
  }
  return loadStateFromFile(resolveOpsNotifyStatePath(env));
}

export async function saveOpsBootNotifyState(
  state: OpsBootNotifyState,
  env: EnvLike = process.env,
): Promise<void> {
  if (isPostgresConfigured(env as NodeJS.ProcessEnv)) {
    await withRlsContext({ retentionJob: true }, async () => {
      await getDb().execute(
        sql`select pg_advisory_xact_lock(hashtextextended('ops-boot-notify', 0))`,
      );
      await saveStateToPostgres(state);
    });
    return;
  }
  await saveStateToFile(resolveOpsNotifyStatePath(env), state);
}

/** Record a successful deploy notify (boot or cron) without sending again. */
export async function recordDeployNotifySuccess(input: {
  commit: string;
  at?: string;
}): Promise<void> {
  const at = input.at ?? new Date().toISOString();
  let previous = emptyOpsBootNotifyState();
  try {
    previous = await loadOpsBootNotifyState();
  } catch (error) {
    console.warn(
      "[ops-boot-notify] failed to load state before deploy record",
      error,
    );
  }
  await saveOpsBootNotifyState({
    ...previous,
    lastDeployCommit: input.commit,
    lastDeployNotifiedAt: at,
  });
}

export async function buildOpsLifecycleNotifySummary(
  env: EnvLike = process.env,
): Promise<{
  deployEnabled: boolean;
  restartEnabled: boolean;
  cooldownMinutes: number;
  dedupeMinutes: number;
  stateBackend: OpsLifecycleNotifyStateBackend;
  lastDeployCommit: string | null;
  lastDeployNotifiedAt: string | null;
  lastRestartNotifiedAt: string | null;
}> {
  const backend = resolveOpsNotifyStateBackend(env);
  let state = emptyOpsBootNotifyState();
  try {
    if (isOpsNotifyOnDeploy(env) || isOpsNotifyOnRestart(env)) {
      state = await loadOpsBootNotifyState(env);
    }
  } catch {
    // Health must not fail — leave state empty
  }
  return {
    deployEnabled: isOpsNotifyOnDeploy(env),
    restartEnabled: isOpsNotifyOnRestart(env),
    cooldownMinutes: readRestartCooldownMinutes(env),
    dedupeMinutes: readDeployDedupeMinutes(env),
    stateBackend: backend,
    lastDeployCommit: state.lastDeployCommit,
    lastDeployNotifiedAt: state.lastDeployNotifiedAt,
    lastRestartNotifiedAt: state.lastRestartNotifiedAt,
  };
}

export type BootLifecycleResult =
  | { ok: true; action: "deploy" | "restart"; messageId?: string }
  | { ok: false; skipped: string; error?: string };

async function runWithLock<T>(fn: () => Promise<T>): Promise<T> {
  if (!isPostgresConfigured()) return fn();
  return withRlsContext({ retentionJob: true }, async () => {
    await getDb().execute(
      sql`select pg_advisory_xact_lock(hashtextextended('ops-boot-notify', 0))`,
    );
    return fn();
  });
}

export async function runBootLifecycleNotify(): Promise<BootLifecycleResult> {
  const deployOn = isOpsNotifyOnDeploy();
  const restartOn = isOpsNotifyOnRestart();
  if (!deployOn && !restartOn) {
    return { ok: false, skipped: "disabled" };
  }

  const to = readDeployNotifyEmail();
  if (!to) {
    return { ok: false, skipped: "no_recipient" };
  }
  if (!isTransactionalEmailAvailable()) {
    return { ok: false, skipped: "email_unavailable" };
  }

  const commit = readCurrentBuildCommit();
  const startedAt = new Date().toISOString();

  try {
    return await runWithLock(async () => {
      let state: OpsBootNotifyState;
      try {
        state = isPostgresConfigured()
          ? await loadStateFromPostgres()
          : await loadStateFromFile(resolveOpsNotifyStatePath());
      } catch (error) {
        console.warn("[ops-boot-notify] state read failed — skipping send", error);
        return { ok: false, skipped: "state_read_failed" };
      }

      const decision = decideBootNotifyAction({
        commit,
        deployOn,
        restartOn,
        state,
        restartCooldownMinutes: readRestartCooldownMinutes(),
        deployDedupeMinutes: readDeployDedupeMinutes(),
      });

      if (decision.action === "skip") {
        return { ok: false, skipped: decision.reason };
      }

      if (decision.action === "deploy") {
        const { buildDeployNotifyPayload } = await import(
          "@/lib/ops/deploy-notify"
        );
        const payload = await buildDeployNotifyPayload();
        const result = await sendTransactionalEmail({
          to,
          subject: payload.subject,
          text: payload.text,
        });
        if (!result.ok) {
          return {
            ok: false,
            skipped: "send_failed",
            error: result.error,
          };
        }

        await auditLog.log({
          userId: "system-boot",
          action: "email.deploy_notify",
          resourceType: "site_admin",
          resourceId: payload.commit || "*",
          metadata: {
            commit: payload.commit,
            version: payload.version,
            ready: payload.ready ? "true" : "false",
            ok: "true",
            source: "boot",
          },
        });

        const nextState: OpsBootNotifyState = {
          ...state,
          lastDeployCommit: payload.commit,
          lastDeployNotifiedAt: startedAt,
        };
        if (isPostgresConfigured()) {
          await saveStateToPostgres(nextState);
        } else {
          await saveStateToFile(resolveOpsNotifyStatePath(), nextState);
        }

        try {
          await autoAckIssuesOnDeploy({ commit: payload.commit });
        } catch (error) {
          console.warn("[ops-boot-notify] auto-ack after deploy failed", error);
        }

        return { ok: true, action: "deploy", messageId: result.messageId };
      }

      // restart
      const artifact = composeOpsLifecycleNotify({
        kind: "restart",
        commit,
        version: readLocalAppVersion(),
        builtAt: readLocalBuildTime(),
        startedAt,
        hostname: process.env.HOSTNAME?.trim() || "unknown",
        pid: process.pid,
      });
      const result = await sendTransactionalEmail({
        to,
        subject: artifact.subject,
        text: artifact.text,
        html: artifact.html,
      });
      if (!result.ok) {
        return {
          ok: false,
          skipped: "send_failed",
          error: result.error,
        };
      }

      await auditLog.log({
        userId: "system-boot",
        action: "email.restart_notify",
        resourceType: "site_admin",
        resourceId: commit || "*",
        metadata: {
          commit,
          version: readLocalAppVersion(),
          ok: "true",
          source: "boot",
        },
      });

      const nextState: OpsBootNotifyState = {
        ...state,
        lastRestartNotifiedAt: startedAt,
      };
      if (isPostgresConfigured()) {
        await saveStateToPostgres(nextState);
      } else {
        await saveStateToFile(resolveOpsNotifyStatePath(), nextState);
      }

      return { ok: true, action: "restart", messageId: result.messageId };
    });
  } catch (error) {
    reportServerError(error, {
      route: "ops-boot-notify",
      source: "server",
    });
    return {
      ok: false,
      skipped: "error",
      error: error instanceof Error ? error.message : "unknown",
    };
  }
}

const BOOT_NOTIFY_SCHEDULED = Symbol.for("unionops.opsBootNotifyScheduled");

type GlobalBootFlag = typeof globalThis & {
  [BOOT_NOTIFY_SCHEDULED]?: boolean;
};

/** One-shot deferred boot notify — never throws into Next register(). */
export function scheduleBootLifecycleNotify(): void {
  const g = globalThis as GlobalBootFlag;
  if (g[BOOT_NOTIFY_SCHEDULED]) return;
  g[BOOT_NOTIFY_SCHEDULED] = true;

  if (!isOpsNotifyOnDeploy() && !isOpsNotifyOnRestart()) return;

  const delay = readBootDelayMs();
  setTimeout(() => {
    void runBootLifecycleNotify().then((result) => {
      if (!result.ok && result.skipped !== "disabled") {
        console.info(
          `[ops-boot-notify] skipped=${result.skipped}${result.error ? ` error=${result.error}` : ""}`,
        );
      } else if (result.ok) {
        console.info(`[ops-boot-notify] sent action=${result.action}`);
      }
    });
  }, delay);
}
