import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("cron observability-alerts auth", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("rejects missing CRON_SECRET", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    const { GET } = await import(
      "@/app/api/cron/observability-alerts/route"
    );
    const res = await GET(new Request("http://localhost/api/cron/observability-alerts"));
    expect(res.status).toBe(401);
  });

  it("skips when alerts disabled with valid secret", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("OBSERVABILITY_ALERTS_ENABLED", "false");
    const { GET } = await import(
      "@/app/api/cron/observability-alerts/route"
    );
    const res = await GET(
      new Request("http://localhost/api/cron/observability-alerts", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { skipped?: string };
    expect(body.skipped).toBe("disabled");
  });
});
