import { describe, expect, it } from "vitest";
import {
  auditDbBackend,
  grievanceDbBackend,
  isMemoryCaseDataActive,
} from "@/lib/db/backend";

describe("db backend flags", () => {
  it("defaults to memory", () => {
    expect(grievanceDbBackend({})).toBe("memory");
    expect(isMemoryCaseDataActive({})).toBe(true);
  });

  it("requires DATABASE_URL for postgres backends", () => {
    expect(
      grievanceDbBackend({ GRIEVANCE_DB_BACKEND: "postgres" }),
    ).toBe("memory");
    expect(
      grievanceDbBackend({
        GRIEVANCE_DB_BACKEND: "postgres",
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
    };
    expect(auditDbBackend(env)).toBe("postgres");
    expect(isMemoryCaseDataActive(env)).toBe(false);
  });
});
