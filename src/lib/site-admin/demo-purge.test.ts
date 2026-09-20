import { describe, expect, it } from "vitest";
import {
  DEMO_PURGE_CONFIRM_PHRASE,
  DEMO_PURGE_UNION_SCOPED_TABLES,
  assertDemoPurgeConfirm,
  formatDemoPurgeCounts,
  totalDemoCount,
} from "./demo-purge";

describe("demo-purge", () => {
  it("requires the exact confirmation phrase", () => {
    expect(() => assertDemoPurgeConfirm(DEMO_PURGE_CONFIRM_PHRASE)).not.toThrow();
    expect(() => assertDemoPurgeConfirm("delete demo")).toThrow(/mismatch/);
    expect(() => assertDemoPurgeConfirm("DELETE DEMO")).toThrow(/mismatch/);
    expect(() => assertDemoPurgeConfirm("")).toThrow(/mismatch/);
  });

  it("sums the four canonical tenant counts", () => {
    expect(
      totalDemoCount({ users: 10, unions: 1, divisions: 1, locals: 4 }),
    ).toBe(16);
  });

  it("formats counts like the CLI / audit metadata", () => {
    expect(
      formatDemoPurgeCounts({
        users: 10,
        unions: 1,
        divisions: 1,
        locals: 4,
      }),
    ).toBe("users=10 unions=1 divisions=1 locals=4 total=16");
  });

  it("keeps an allowlist of union-scoped tables (no operator input)", () => {
    expect(DEMO_PURGE_UNION_SCOPED_TABLES).toContain("grievances");
    expect(DEMO_PURGE_UNION_SCOPED_TABLES).toContain("bumping_cases");
    expect(DEMO_PURGE_UNION_SCOPED_TABLES).not.toContain("users");
    expect(DEMO_PURGE_UNION_SCOPED_TABLES).not.toContain("unions");
    // Child tables without union_id must not appear — cascade from parents.
    expect(DEMO_PURGE_UNION_SCOPED_TABLES).not.toContain("grievance_events");
    expect(DEMO_PURGE_UNION_SCOPED_TABLES).not.toContain("committee_sessions");
  });
});
