import { describe, expect, it } from "vitest";
import type { MembershipIntegrityIssue } from "./membership-integrity";

describe("membership integrity issue shape", () => {
  it("documents severity codes used by the site-admin scan", () => {
    const sample: MembershipIntegrityIssue = {
      code: "orphan_no_local",
      severity: "high",
      userId: "u1",
      unionId: "union-1",
      detail: "example",
    };
    expect(sample.code).toBe("orphan_no_local");
    expect(["high", "medium", "low"]).toContain(sample.severity);
  });
});
