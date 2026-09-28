import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email/enterprise-gates", () => ({
  assertEnterpriseEmailCapability: vi.fn(),
}));

import { assertEnterpriseEmailCapability } from "@/lib/email/enterprise-gates";
import { resolveOpenTracking } from "@/lib/email/tracking";

const assertGate = vi.mocked(assertEnterpriseEmailCapability);

describe("resolveOpenTracking", () => {
  afterEach(() => {
    assertGate.mockReset();
  });

  it("never applies tracking without explicit opt-in", async () => {
    const result = await resolveOpenTracking({
      unionId: "union-1",
      explicitOptIn: false,
    });
    expect(result).toEqual({ apply: false, reason: "not_requested" });
    expect(assertGate).not.toHaveBeenCalled();
  });

  it("stays off when dual gate fails even with opt-in", async () => {
    assertGate.mockResolvedValue({ ok: false, reason: "host_disabled" });
    const result = await resolveOpenTracking({
      unionId: "union-1",
      explicitOptIn: true,
    });
    expect(result).toEqual({ apply: false, reason: "host_disabled" });
    expect(assertGate).toHaveBeenCalledWith("tracking_pixels", "union-1");
  });

  it("applies only after both gates and explicit opt-in", async () => {
    assertGate.mockResolvedValue({ ok: true });
    const result = await resolveOpenTracking({
      unionId: "union-1",
      explicitOptIn: true,
    });
    expect(result).toEqual({ apply: true });
  });
});
