import { afterEach, describe, expect, it } from "vitest";
import {
  decideBootNotifyAction,
  emptyOpsBootNotifyState,
  isOpsNotifyOnDeploy,
  isOpsNotifyOnRestart,
  readRestartCooldownMinutes,
  readDeployDedupeMinutes,
} from "@/lib/ops/boot-notify";
import { composeOpsLifecycleNotify } from "@/lib/email/engine/compose-ops-lifecycle";

describe("ops notify env gates", () => {
  it("aliases DEPLOY_NOTIFY_ENABLED into deploy-on", () => {
    expect(isOpsNotifyOnDeploy({})).toBe(false);
    expect(isOpsNotifyOnDeploy({ DEPLOY_NOTIFY_ENABLED: "true" })).toBe(true);
    expect(isOpsNotifyOnDeploy({ OPS_NOTIFY_ON_DEPLOY: "yes" })).toBe(true);
    expect(isOpsNotifyOnRestart({ OPS_NOTIFY_ON_RESTART: "1" })).toBe(true);
    expect(isOpsNotifyOnRestart({})).toBe(false);
  });

  it("parses cooldown and dedupe defaults", () => {
    expect(readRestartCooldownMinutes({})).toBe(15);
    expect(readDeployDedupeMinutes({})).toBe(10);
    expect(
      readRestartCooldownMinutes({ OPS_NOTIFY_RESTART_COOLDOWN_MINUTES: "30" }),
    ).toBe(30);
  });
});

describe("decideBootNotifyAction", () => {
  const now = Date.parse("2026-10-02T12:00:00.000Z");

  it("sends deploy on first boot when deploy-on and commit known", () => {
    expect(
      decideBootNotifyAction({
        commit: "abcdef1",
        deployOn: true,
        restartOn: true,
        state: emptyOpsBootNotifyState(),
        nowMs: now,
      }),
    ).toEqual({ action: "deploy" });
  });

  it("subsumes restart when deploy fires", () => {
    const decision = decideBootNotifyAction({
      commit: "newcommit",
      deployOn: true,
      restartOn: true,
      state: {
        lastDeployCommit: "oldcommit",
        lastDeployNotifiedAt: "2026-10-01T00:00:00.000Z",
        lastRestartNotifiedAt: null,
      },
      nowMs: now,
    });
    expect(decision).toEqual({ action: "deploy" });
  });

  it("skips within deploy dedupe window for same commit", () => {
    expect(
      decideBootNotifyAction({
        commit: "abcdef1",
        deployOn: true,
        restartOn: true,
        state: {
          lastDeployCommit: "abcdef1",
          lastDeployNotifiedAt: "2026-10-02T11:55:00.000Z",
          lastRestartNotifiedAt: null,
        },
        nowMs: now,
        deployDedupeMinutes: 10,
      }),
    ).toEqual({ action: "skip", reason: "deploy_dedupe_window" });
  });

  it("sends restart for same commit outside dedupe when restart-on", () => {
    expect(
      decideBootNotifyAction({
        commit: "abcdef1",
        deployOn: true,
        restartOn: true,
        state: {
          lastDeployCommit: "abcdef1",
          lastDeployNotifiedAt: "2026-10-02T10:00:00.000Z",
          lastRestartNotifiedAt: null,
        },
        nowMs: now,
        deployDedupeMinutes: 10,
      }),
    ).toEqual({ action: "restart" });
  });

  it("never claims deploy for unknown commit", () => {
    expect(
      decideBootNotifyAction({
        commit: "unknown",
        deployOn: true,
        restartOn: true,
        state: emptyOpsBootNotifyState(),
        nowMs: now,
      }),
    ).toEqual({ action: "restart" });
  });

  it("respects restart cooldown", () => {
    expect(
      decideBootNotifyAction({
        commit: "abcdef1",
        deployOn: false,
        restartOn: true,
        state: {
          lastDeployCommit: "abcdef1",
          lastDeployNotifiedAt: "2026-09-01T00:00:00.000Z",
          lastRestartNotifiedAt: "2026-10-02T11:50:00.000Z",
        },
        nowMs: now,
        restartCooldownMinutes: 15,
      }),
    ).toEqual({ action: "skip", reason: "restart_cooldown" });
  });

  it("skips when restart disabled and no deploy", () => {
    expect(
      decideBootNotifyAction({
        commit: "abcdef1",
        deployOn: false,
        restartOn: false,
        state: emptyOpsBootNotifyState(),
        nowMs: now,
      }),
    ).toEqual({ action: "skip", reason: "restart_disabled" });
  });
});

describe("composeOpsLifecycleNotify", () => {
  it("builds a restart artifact without secrets", () => {
    const artifact = composeOpsLifecycleNotify({
      kind: "restart",
      commit: "abcdef123456",
      version: "0.1.0",
      builtAt: "2026-10-02T00:00:00Z",
      startedAt: "2026-10-02T12:00:00Z",
      hostname: "caprover-app",
      pid: 42,
    });
    expect(artifact.subject).toContain("restart");
    expect(artifact.subject).toContain("abcdef1");
    expect(artifact.text).toContain("caprover-app");
    expect(artifact.text).toContain("42");
    expect(artifact.text).not.toMatch(/api[_-]?key/i);
  });
});

describe("deploy-notify alias via isDeployNotifyEnabled", () => {
  const previous = process.env.OPS_NOTIFY_ON_DEPLOY;

  afterEach(() => {
    if (previous === undefined) delete process.env.OPS_NOTIFY_ON_DEPLOY;
    else process.env.OPS_NOTIFY_ON_DEPLOY = previous;
  });

  it("isOpsNotifyOnDeploy reads process env for OPS_NOTIFY_ON_DEPLOY", () => {
    process.env.OPS_NOTIFY_ON_DEPLOY = "true";
    expect(isOpsNotifyOnDeploy()).toBe(true);
  });
});
