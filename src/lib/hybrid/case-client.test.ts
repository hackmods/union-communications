import { describe, expect, it, vi } from "vitest";
import {
  grievanceListErrorKey,
  HybridCaseApiError,
  listHybridGrievances,
} from "@/lib/hybrid/case-client";

vi.mock("@/lib/hybrid/local-slice-adapter", () => ({
  hybridLocalSliceAdapter: {
    getDataMode: vi.fn(async () => "central"),
  },
}));

vi.mock("@/lib/hybrid/live-session", () => ({
  isLiveHybridUnlocked: vi.fn(() => false),
  getLiveHybridSlice: vi.fn(() => null),
  mutateLiveHybridSlice: vi.fn(),
}));

describe("HybridCaseApiError / grievanceListErrorKey", () => {
  it("maps 401/403 to dedicated keys and other statuses to loadError", () => {
    expect(grievanceListErrorKey(new HybridCaseApiError(401, "Unauthorized", "x"))).toBe(
      "loadErrorUnauthorized",
    );
    expect(grievanceListErrorKey(new HybridCaseApiError(403, "Forbidden", "x"))).toBe(
      "loadErrorForbidden",
    );
    expect(
      grievanceListErrorKey(
        new HybridCaseApiError(403, "Grievance module disabled", "x"),
      ),
    ).toBe("loadErrorModuleDisabled");
    expect(grievanceListErrorKey(new HybridCaseApiError(500, "boom", "x"))).toBe("loadError");
    expect(grievanceListErrorKey(new Error("network"))).toBe("loadError");
  });
});

describe("listHybridGrievances central errors", () => {
  it("throws HybridCaseApiError with API body on non-OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(listHybridGrievances()).rejects.toMatchObject({
      name: "HybridCaseApiError",
      status: 403,
      apiError: "Forbidden",
    });

    vi.unstubAllGlobals();
  });

  it("returns grievances on 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ grievances: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(listHybridGrievances()).resolves.toEqual({
      source: "central",
      grievances: [],
    });

    vi.unstubAllGlobals();
  });
});
