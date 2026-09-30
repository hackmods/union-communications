import { describe, expect, it } from "vitest";
import { redactEventFields, redactText } from "@/lib/observability/redact";

describe("redact", () => {
  it("strips bearer tokens and emails from text", () => {
    const out = redactText(
      "user a@b.co got Bearer abcdef123 and eyJhbGciOiJIUzI1NiJ9.aaa.bbb",
    );
    expect(out).toContain("[REDACTED_EMAIL]");
    expect(out).toContain("Bearer [REDACTED]");
    expect(out).toContain("[REDACTED_JWT]");
    expect(out).not.toContain("a@b.co");
    expect(out).not.toContain("abcdef123");
  });

  it("redacts sensitive meta keys", () => {
    const fields = redactEventFields({
      message: "ok",
      meta: { password: "secret", route: "/api/x" },
    });
    expect(fields.meta?.password).toBe("[REDACTED]");
    expect(fields.meta?.route).toBe("/api/x");
  });
});
