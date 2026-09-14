import { afterEach, describe, expect, it } from "vitest";
import {
  checkPollSubmitRateLimit,
  extractClientIp,
  hashClientIp,
  resetPollSubmitRateLimit,
} from "./rate-limit";

describe("poll submit rate limit", () => {
  afterEach(() => {
    resetPollSubmitRateLimit();
  });

  it("reads the first forwarded IP, then x-real-ip, then unknown", () => {
    expect(
      extractClientIp(
        new Request("http://localhost", {
          headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
        }),
      ),
    ).toBe("203.0.113.10");
    expect(
      extractClientIp(
        new Request("http://localhost", {
          headers: { "x-real-ip": "198.51.100.20" },
        }),
      ),
    ).toBe("198.51.100.20");
    expect(extractClientIp(new Request("http://localhost"))).toBe("unknown");
  });

  it("hashes the IP rather than storing it, and trips after 8 submits", () => {
    const hash = hashClientIp("203.0.113.10", "test-salt");
    expect(hash).not.toBe("203.0.113.10");
    expect(hash).toHaveLength(64);

    for (let i = 0; i < 8; i += 1) {
      expect(checkPollSubmitRateLimit("ip-a")).toBe(true);
    }
    expect(checkPollSubmitRateLimit("ip-a")).toBe(false);
    expect(checkPollSubmitRateLimit("ip-b")).toBe(true);

    resetPollSubmitRateLimit();
    expect(checkPollSubmitRateLimit("ip-a")).toBe(true);
  });
});
