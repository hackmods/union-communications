import { describe, expect, it } from "vitest";
import {
  FRAME_ANCESTORS_AUTH,
  FRAME_ANCESTORS_PUBLIC,
  VIEWPORT_LAB_BLOCKED_PATH_PREFIXES,
  X_FRAME_OPTIONS_AUTH,
  X_FRAME_OPTIONS_PUBLIC,
  authSecurityHeaders,
  buildContentSecurityPolicy,
  publicSecurityHeaders,
} from "./framing-policy";

describe("framing-policy", () => {
  it("allows same-origin framing on public surfaces", () => {
    expect(X_FRAME_OPTIONS_PUBLIC).toBe("SAMEORIGIN");
    expect(FRAME_ANCESTORS_PUBLIC).toBe("'self'");
    const csp = buildContentSecurityPolicy(FRAME_ANCESTORS_PUBLIC);
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).not.toContain("frame-ancestors 'none'");
  });

  it("denies framing on Hub and Portal", () => {
    expect(X_FRAME_OPTIONS_AUTH).toBe("DENY");
    expect(FRAME_ANCESTORS_AUTH).toBe("'none'");
    const headers = authSecurityHeaders();
    expect(headers.find((h) => h.key === "X-Frame-Options")?.value).toBe(
      "DENY",
    );
    expect(
      headers.find((h) => h.key === "Content-Security-Policy")?.value,
    ).toContain("frame-ancestors 'none'");
  });

  it("exports header sets with matching XFO and CSP", () => {
    const pub = publicSecurityHeaders();
    expect(pub.find((h) => h.key === "X-Frame-Options")?.value).toBe(
      "SAMEORIGIN",
    );
    expect(
      pub.find((h) => h.key === "Content-Security-Policy")?.value,
    ).toContain("frame-ancestors 'self'");
  });

  it("lists viewport-lab blocked path prefixes", () => {
    expect(VIEWPORT_LAB_BLOCKED_PATH_PREFIXES).toContain("/viewport-lab");
    expect(VIEWPORT_LAB_BLOCKED_PATH_PREFIXES).toContain("/app");
    expect(VIEWPORT_LAB_BLOCKED_PATH_PREFIXES).toContain("/portal");
  });
});
