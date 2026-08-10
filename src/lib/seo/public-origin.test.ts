import { describe, expect, it } from "vitest";
import { resolvePublicOrigin } from "./public-origin";

describe("resolvePublicOrigin", () => {
  it("prefers AUTH_URL over forwarded headers", () => {
    expect(
      resolvePublicOrigin({
        authUrl: "https://unionops.org",
        forwardedHost: "union-communications.behind7proxies.com",
        forwardedProto: "https",
      }),
    ).toBe("https://unionops.org");
  });

  it("strips a trailing path from AUTH_URL", () => {
    expect(
      resolvePublicOrigin({ authUrl: "https://unionops.org/en/" }),
    ).toBe("https://unionops.org");
  });

  it("uses X-Forwarded-Host + Proto when AUTH_URL is unset", () => {
    expect(
      resolvePublicOrigin({
        authUrl: null,
        forwardedHost: "unionops.org",
        forwardedProto: "https",
      }),
    ).toBe("https://unionops.org");
  });

  it("takes the first host when X-Forwarded-Host is a list", () => {
    expect(
      resolvePublicOrigin({
        forwardedHost: "unionops.org, behind7proxies.com",
        forwardedProto: "https",
      }),
    ).toBe("https://unionops.org");
  });

  it("defaults proto to https when only host is forwarded", () => {
    expect(
      resolvePublicOrigin({
        forwardedHost: "example.com",
      }),
    ).toBe("https://example.com");
  });

  it("returns null when nothing usable is set (caller keeps request origin)", () => {
    expect(resolvePublicOrigin({})).toBeNull();
    expect(resolvePublicOrigin({ authUrl: "not-a-url" })).toBeNull();
  });
});
