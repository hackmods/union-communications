import { afterEach, describe, expect, it } from "vitest";
import {
  ACCESS_REQUEST_MAX_PER_EMAIL,
  ACCESS_REQUEST_MAX_PER_IP,
  ACCESS_REQUEST_MAX_UNKNOWN,
  checkAccessRequestEmailRateLimit,
  checkAccessRequestRateLimit,
  extractAccessRequestClientIp,
  hashAccessRequestClientIp,
  resetAccessRequestRateLimit,
} from "./rate-limit";

describe("access request rate limit", () => {
  afterEach(() => {
    resetAccessRequestRateLimit();
  });

  it("prefers Cloudflare, then the first forwarded IP, then x-real-ip", () => {
    expect(
      extractAccessRequestClientIp(
        new Request("http://localhost", {
          headers: {
            "cf-connecting-ip": "203.0.113.9",
            "x-forwarded-for": "198.51.100.1, 10.0.0.1",
            "x-real-ip": "192.0.2.8",
          },
        }),
      ),
    ).toBe("203.0.113.9");
    expect(
      extractAccessRequestClientIp(
        new Request("http://localhost", {
          headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
        }),
      ),
    ).toBe("203.0.113.10");
    expect(
      extractAccessRequestClientIp(
        new Request("http://localhost", {
          headers: { "x-real-ip": "198.51.100.20" },
        }),
      ),
    ).toBe("198.51.100.20");
    expect(extractAccessRequestClientIp(new Request("http://localhost"))).toBe(
      "unknown",
    );
  });

  it("hashes the IP rather than storing it, and allows a hall-sized burst per IP", () => {
    const hash = hashAccessRequestClientIp("203.0.113.10", "test-salt");
    expect(hash).not.toBe("203.0.113.10");
    expect(hash).toHaveLength(64);

    for (let i = 0; i < ACCESS_REQUEST_MAX_PER_IP; i += 1) {
      expect(checkAccessRequestRateLimit("203.0.113.10")).toBe(true);
    }
    expect(checkAccessRequestRateLimit("203.0.113.10")).toBe(false);
    expect(checkAccessRequestRateLimit("198.51.100.20")).toBe(true);

    resetAccessRequestRateLimit();
    expect(checkAccessRequestRateLimit("203.0.113.10")).toBe(true);
  });

  it("keeps unknown on a separate higher cap so missing headers cannot lock a workshop", () => {
    for (let i = 0; i < ACCESS_REQUEST_MAX_PER_IP; i += 1) {
      expect(checkAccessRequestRateLimit("unknown")).toBe(true);
    }
    expect(checkAccessRequestRateLimit("unknown")).toBe(true);
    expect(checkAccessRequestRateLimit("203.0.113.77")).toBe(true);

    for (
      let i = ACCESS_REQUEST_MAX_PER_IP + 1;
      i < ACCESS_REQUEST_MAX_UNKNOWN;
      i += 1
    ) {
      expect(checkAccessRequestRateLimit("unknown")).toBe(true);
    }
    expect(checkAccessRequestRateLimit("unknown")).toBe(false);
    expect(checkAccessRequestRateLimit("203.0.113.77")).toBe(true);
  });

  it("caps the same email separately so one person cannot fill the hall burst", () => {
    for (let i = 0; i < ACCESS_REQUEST_MAX_PER_EMAIL; i += 1) {
      expect(checkAccessRequestEmailRateLimit("Alex@Example.test")).toBe(true);
    }
    expect(checkAccessRequestEmailRateLimit("alex@example.test")).toBe(false);
    expect(checkAccessRequestEmailRateLimit("other@example.test")).toBe(true);
  });
});
