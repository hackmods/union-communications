import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetObservabilityBootWarnState,
  warnObservabilityMisconfigOnce,
} from "@/lib/observability/boot-warn";

beforeEach(() => {
  resetObservabilityBootWarnState();
});

afterEach(() => {
  resetObservabilityBootWarnState();
  vi.restoreAllMocks();
});

describe("warnObservabilityMisconfigOnce", () => {
  it("warns once for each misconfig class", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const env = {
      SENTRY_ENABLED: "true",
      SENTRY_DSN: "https://private@o0.ingest.sentry.io/1",
      ERROR_LOG_FILE_ENABLED: "true",
    };
    warnObservabilityMisconfigOnce(env);
    warnObservabilityMisconfigOnce(env);
    expect(warn).toHaveBeenCalledTimes(2);
    const joined = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toContain("NEXT_PUBLIC_SENTRY_DSN");
    expect(joined).toContain("ERROR_LOG_FILE_PATH");
  });

  it("warns when Sentry enabled without any DSN", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnObservabilityMisconfigOnce({ SENTRY_ENABLED: "true" });
    expect(String(warn.mock.calls[0]?.[0])).toContain("SENTRY_ENABLED=true");
  });

  it("stays quiet when sinks are correctly configured", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnObservabilityMisconfigOnce({
      SENTRY_ENABLED: "true",
      NEXT_PUBLIC_SENTRY_DSN: "https://key@o0.ingest.sentry.io/1",
      ERROR_LOG_FILE_ENABLED: "true",
      ERROR_LOG_FILE_PATH: "/data/logs/x.jsonl",
    });
    expect(warn).not.toHaveBeenCalled();
  });
});
