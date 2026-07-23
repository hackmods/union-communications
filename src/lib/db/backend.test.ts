import { describe, expect, it } from "vitest";
import {
  auditDbBackend,
  bumpingDbBackend,
  grievanceDbBackend,
  isMemoryCaseDataActive,
  timeDbBackend,
} from "@/lib/db/backend";

describe("db backend flags", () => {
  it("defaults to memory", () => {
    expect(grievanceDbBackend({})).toBe("memory");
    expect(bumpingDbBackend({})).toBe("memory");
    expect(auditDbBackend({})).toBe("memory");
    expect(timeDbBackend({})).toBe("memory");
    expect(isMemoryCaseDataActive({})).toBe(true);
  });

  it("requires DATABASE_URL for postgres backends", () => {
    expect(
      grievanceDbBackend({ GRIEVANCE_DB_BACKEND: "postgres" }),
    ).toBe("memory");
    expect(
      timeDbBackend({ TIME_DB_BACKEND: "postgres" }),
    ).toBe("memory");
    expect(
      grievanceDbBackend({
        GRIEVANCE_DB_BACKEND: "postgres",
        DATABASE_URL: "postgres://localhost/unionops",
      }),
    ).toBe("postgres");
    expect(
      timeDbBackend({
        TIME_DB_BACKEND: "postgres",
        DATABASE_URL: "postgres://localhost/unionops",
      }),
    ).toBe("postgres");
  });

  it("reports memory inactive only when all backends are postgres", () => {
    const env = {
      DATABASE_URL: "postgres://localhost/unionops",
      GRIEVANCE_DB_BACKEND: "postgres",
      BUMPING_DB_BACKEND: "postgres",
      AUDIT_DB_BACKEND: "postgres",
      TIME_DB_BACKEND: "postgres",
    };
    expect(auditDbBackend(env)).toBe("postgres");
    expect(timeDbBackend(env)).toBe("postgres");
    expect(isMemoryCaseDataActive(env)).toBe(false);
  });

  it("keeps memory active when time backend is still memory", () => {
    const env = {
      DATABASE_URL: "postgres://localhost/unionops",
      GRIEVANCE_DB_BACKEND: "postgres",
      BUMPING_DB_BACKEND: "postgres",
      AUDIT_DB_BACKEND: "postgres",
      TIME_DB_BACKEND: "memory",
    };
    expect(isMemoryCaseDataActive(env)).toBe(true);
  });
});
