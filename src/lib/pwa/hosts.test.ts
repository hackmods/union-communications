import { describe, expect, it } from "vitest";
import {
  PWA_PRODUCTION_HOSTS,
  shouldRegisterServiceWorker,
} from "./hosts";

describe("shouldRegisterServiceWorker", () => {
  it("allows production UnionOps hosts", () => {
    expect(shouldRegisterServiceWorker("unionops.org")).toBe(true);
    expect(shouldRegisterServiceWorker("www.unionops.org")).toBe(true);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(shouldRegisterServiceWorker(" UnionOps.org ")).toBe(true);
    expect(shouldRegisterServiceWorker("WWW.UNIONOPS.ORG")).toBe(true);
  });

  it("rejects localhost, IPs, and preview hosts", () => {
    for (const host of [
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

  it("keeps the production host allowlist tight", () => {
    expect([...PWA_PRODUCTION_HOSTS].sort()).toEqual([
      "unionops.org",
      "www.unionops.org",
    ]);
  });
});
