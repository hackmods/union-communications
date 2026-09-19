import { describe, expect, it } from "vitest";
import { classifyServerError } from "@/lib/observability/signal-classify";

describe("classifyServerError", () => {
  it("returns default error/null for unknown errors", () => {
    const out = classifyServerError(new Error("boom"));
    expect(out).toEqual({ level: "error", signal: null });
  });

  it("classifies CredentialsSignin by error.name", () => {
    const err = Object.assign(new Error(""), { name: "CredentialsSignin" });
    const out = classifyServerError(err);
    expect(out).toEqual({ level: "warn", signal: "auth.credentials_failed" });
  });

  it("classifies CredentialsSignin by substring", () => {
    const out = classifyServerError(new Error("Wrapped: CredentialsSignin"));
    expect(out.level).toBe("warn");
    expect(out.signal).toBe("auth.credentials_failed");
  });

  it("classifies bare 'Failed to find Server Action' as drift", () => {
    const out = classifyServerError(new Error("Failed to find Server Action"));
    expect(out).toEqual({ level: "info", signal: "action.drift" });
  });

  it("classifies hashed 'Failed to find Server Action <id>' as drift", () => {
    const out = classifyServerError(
      new Error("Failed to find Server Action abc1234"),
    );
    expect(out).toEqual({ level: "info", signal: "action.drift" });
  });

  it("does NOT misclassify partial substring matches", () => {
    const out = classifyServerError(
      new Error("Failed to find Server Action fallback adapter"),
    );
    expect(out.level).toBe("info");
    expect(out.signal).toBe("action.drift");
  });

  it("survives unknown inputs without throwing", () => {
    expect(() => classifyServerError(null)).not.toThrow();
    expect(() => classifyServerError(undefined)).not.toThrow();
    expect(() => classifyServerError(42)).not.toThrow();
    expect(() => classifyServerError({})).not.toThrow();
    expect(() =>
      classifyServerError({ name: "CredentialsSignin" }),
    ).not.toThrow();
  });
});
