import { describe, expect, it } from "vitest";
import {
  PWA_PRODUCTION_HOSTS,
  shouldRegisterServiceWorker,
} from "./hosts";

describe("shouldRegisterServiceWorker", () => {
  it("allows the apex UnionOps host", () => {
    expect(shouldRegisterServiceWorker("unionops.org")).toBe(true);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(shouldRegisterServiceWorker(" UnionOps.org ")).toBe(true);
  });

  it("rejects www stub, localhost, IPs, and preview hosts", () => {
    for (const host of [
      "www.unionops.org",
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "example.com",
      "staging.unionops.org",
      "unionops.org.evil.example",
      "",
      "unionops.org.",
    ]) {
      expect(shouldRegisterServiceWorker(host)).toBe(false);
    }
  });

  it("keeps the production host allowlist apex-only", () => {
    expect([...PWA_PRODUCTION_HOSTS]).toEqual(["unionops.org"]);
  });
});
