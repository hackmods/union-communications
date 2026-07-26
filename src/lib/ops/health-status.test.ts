import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { buildHealthStatus } from "@/lib/ops/health-status";

describe("buildHealthStatus", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("returns ok with commit and default memory backends", () => {
    delete process.env.BUILD_COMMIT_SHA;
    delete process.env.GRIEVANCE_DB_BACKEND;
    const status = buildHealthStatus();
    expect(status.status).toBe("ok");
    expect(status.commit).toBe("unknown");
    expect(status.backends.GRIEVANCE_DB_BACKEND).toBe("memory");
    expect(status.emailEnabled).toBe(false);
  });

  it("reflects configured commit and postgres flags", () => {
    process.env.BUILD_COMMIT_SHA = "abc1234";
    process.env.GRIEVANCE_DB_BACKEND = "postgres";
    process.env.EMAIL_ENABLED = "true";
    const status = buildHealthStatus();
    expect(status.commit).toBe("abc1234");
    expect(status.backends.GRIEVANCE_DB_BACKEND).toBe("postgres");
    expect(status.emailEnabled).toBe(true);
  });
});
