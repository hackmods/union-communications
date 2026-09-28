import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertProductionInterlock,
  isLoadLabEnabled,
  resolveBaseUrl,
} from "@/lib/ops/load-lab/env";
import { buildBottleneckHints, summarizeCapacity } from "@/lib/ops/load-lab/hints";
import { classifyTier, percentile } from "@/lib/ops/load-lab/thresholds";
import { parseSummaryJson } from "@/lib/ops/load-lab/report";
import {
  assertAllowedTargetUrl,
  createRollingStats,
  filterCapacityTiers,
  midTierShouldAbort,
  recordSample,
} from "@/lib/ops/load-lab/safety";
import {
  getLoadLabStatus,
  resetLoadLabStateForTests,
  startLoadLabRun,
} from "@/lib/ops/load-lab/process-manager";
import type { LoadLabSummary, TierResult } from "@/lib/ops/load-lab/types";

vi.mock("@/lib/auth/site-admin-session", () => ({
  requireSiteAdminSession: vi.fn(async () => ({
    ok: true,
    session: {
      user: {
        id: "admin-1",
        unionId: "u1",
        localId: "l1",
        roles: ["platform_admin"],
      },
    },
  })),
}));

vi.mock("@/lib/audit/store", () => ({
  auditLog: { log: vi.fn(async () => ({})) },
}));

vi.mock("@/lib/ops/health-status", () => ({
  buildHealthStatus: vi.fn(async () => ({
    version: "0.0.0-test",
    commit: "abc123",
  })),
}));

afterEach(() => {
  resetLoadLabStateForTests();
  vi.unstubAllEnvs();
});

describe("load-lab thresholds", () => {
  it("classifies healthy degraded failed", () => {
    expect(classifyTier(0, 400)).toBe("healthy");
    expect(classifyTier(0.02, 400)).toBe("degraded");
    expect(classifyTier(0, 900)).toBe("degraded");
    expect(classifyTier(0.06, 400)).toBe("failed");
    expect(classifyTier(0, 3500)).toBe("failed");
  });

  it("computes percentiles", () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50)).toBe(5);
    expect(percentile([], 95)).toBe(0);
  });
});

describe("load-lab env interlock", () => {
  it("refuses when LOAD_LAB_ENABLED is off", () => {
    vi.stubEnv("LOAD_LAB_ENABLED", "false");
    expect(isLoadLabEnabled()).toBe(false);
    expect(
      assertProductionInterlock({ envName: "local", allowProduction: true }),
    ).toMatchObject({ ok: false });
  });

  it("requires dual production flags", () => {
    vi.stubEnv("LOAD_LAB_ENABLED", "true");
    vi.stubEnv("ALLOW_PRODUCTION_LOAD_TEST", "false");
    expect(
      assertProductionInterlock({
        envName: "production",
        allowProduction: true,
      }),
    ).toMatchObject({ ok: false });

    vi.stubEnv("ALLOW_PRODUCTION_LOAD_TEST", "true");
    expect(
      assertProductionInterlock({
        envName: "production",
        allowProduction: false,
      }),
    ).toMatchObject({ ok: false });

    expect(
      assertProductionInterlock({
        envName: "production",
        allowProduction: true,
      }),
    ).toEqual({ ok: true });
  });

  it("resolves loopback by default", () => {
    vi.stubEnv("PORT", "3456");
    expect(
      resolveBaseUrl({ envName: "local", preferLoopback: true }),
    ).toBe("http://127.0.0.1:3456");
  });
});

describe("load-lab hints", () => {
  it("summarizes capacity tiers", () => {
    const tiers: TierResult[] = [
      {
        vus: 50,
        reqPerSec: 20,
        iterations: 100,
        successful: 100,
        failed: 0,
        errorRate: 0,
        p50Ms: 100,
        p95Ms: 200,
        p99Ms: 300,
        maxMs: 400,
        authFailures: 0,
        timeouts: 0,
        endpoints: [],
        verdict: "healthy",
      },
      {
        vus: 100,
        reqPerSec: 22,
        iterations: 100,
        successful: 95,
        failed: 5,
        errorRate: 0.05,
        p50Ms: 200,
        p95Ms: 900,
        p99Ms: 1200,
        maxMs: 2000,
        authFailures: 0,
        timeouts: 2,
        endpoints: [
          {
            name: "GET hub dashboard",
            count: 50,
            errors: 5,
            errorRate: 0.1,
            p50Ms: 400,
            p95Ms: 2000,
            p99Ms: 3000,
          },
        ],
        verdict: "degraded",
      },
      {
        vus: 250,
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
        skipReason: "abort",
      },
    ];
    const s = summarizeCapacity(tiers);
    expect(s.lastHealthyVus).toBe(50);
    expect(s.firstDegradedVus).toBe(100);
    expect(s.firstFailedVus).toBeNull();
    expect(s.sustainableReqPerSec).toBe(20);

    const summary: LoadLabSummary = {
      schemaVersion: 1,
      measurementMode: "on-box-colocated",
      runId: "test",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      profile: "capacity",
      envName: "local",
      baseUrl: "http://127.0.0.1:3000",
      tiers,
      ...s,
      hints: [],
      aborted: true,
      notes: [],
    };
    const hints = buildBottleneckHints(summary);
    expect(hints.some((h) => h.id === "writes-not-measured")).toBe(true);
    expect(hints.some((h) => h.id === "colocated")).toBe(true);
    expect(hints.some((h) => h.id === "hot-endpoint")).toBe(true);
  });
});

describe("load-lab summary parse", () => {
  it("rejects wrong schema", () => {
    expect(parseSummaryJson({ schemaVersion: 2 })).toBeNull();
    expect(
      parseSummaryJson({
        schemaVersion: 1,
        runId: "r1",
        tiers: [],
      }),
    ).not.toBeNull();
  });
});

describe("load-lab safety harness", () => {
  it("allowlists only loopback and AUTH_URL host", () => {
    vi.stubEnv("AUTH_URL", "https://unionops.org");
    expect(assertAllowedTargetUrl("http://127.0.0.1:3000")).toEqual({
      ok: true,
    });
    expect(assertAllowedTargetUrl("https://unionops.org")).toEqual({ ok: true });
    expect(assertAllowedTargetUrl("https://evil.example")).toMatchObject({
      ok: false,
    });
  });

  it("filters capacity tiers above the VU cap", () => {
    expect(filterCapacityTiers([50, 100, 250, 500, 1000], 100)).toEqual({
      run: [50, 100],
      skipped: [250, 500, 1000],
    });
  });

  it("trips mid-tier abort on high error rate", () => {
    const stats = createRollingStats();
    for (let i = 0; i < 50; i++) {
      recordSample(stats, { ms: 100, ok: i % 2 === 0 });
    }
    expect(
      midTierShouldAbort(stats, 0.1, 5000, percentile),
    ).toMatchObject({ abort: true });
  });
});

describe("load-lab process manager gate", () => {
  it("refuses start when LOAD_LAB_ENABLED is off", async () => {
    vi.stubEnv("LOAD_LAB_ENABLED", "false");
    const result = await startLoadLabRun({
      profile: "smoke",
      envName: "local",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
    expect(getLoadLabStatus().enabled).toBe(false);
  });

  it("refuses SSRF-style external baseUrl", async () => {
    vi.stubEnv("LOAD_LAB_ENABLED", "true");
    vi.stubEnv("AUTH_URL", "https://unionops.org");
    const result = await startLoadLabRun({
      profile: "smoke",
      envName: "local",
      baseUrl: "https://evil.example",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/not allowed/i);
    }
  });
});
