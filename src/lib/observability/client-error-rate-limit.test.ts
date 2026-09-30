import { afterEach, describe, expect, it } from "vitest";
import {
  checkClientErrorRateLimit,
  resetClientErrorRateLimit,
} from "@/lib/observability/client-error-rate-limit";

afterEach(() => {
  resetClientErrorRateLimit();
});

describe("checkClientErrorRateLimit", () => {
  it("allows up to 20 then blocks", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(checkClientErrorRateLimit("ip-a")).toBe(true);
    }
    expect(checkClientErrorRateLimit("ip-a")).toBe(false);
    expect(checkClientErrorRateLimit("ip-b")).toBe(true);
  });
});
