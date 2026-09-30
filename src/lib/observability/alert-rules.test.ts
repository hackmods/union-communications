import { describe, expect, it } from "vitest";
import {
  isObservabilityAlertsEnabled,
  isWithinCooldown,
  levelMeetsMinimum,
  ruleMatchesEvent,
  shouldFireAlert,
} from "@/lib/observability/alert-rules";

describe("observability alert-rules helpers", () => {
  it("ranks levels for minimum matching", () => {
    expect(levelMeetsMinimum("error", "error")).toBe(true);
    expect(levelMeetsMinimum("warn", "error")).toBe(false);
    expect(levelMeetsMinimum("error", "warn")).toBe(true);
    expect(levelMeetsMinimum("info", "info")).toBe(true);
  });

  it("matches sources and fingerprint when set", () => {
    expect(
      ruleMatchesEvent(
        { minLevel: "error", sources: ["server"], fingerprint: null },
        { level: "error", source: "client" },
      ),
    ).toBe(false);
    expect(
      ruleMatchesEvent(
        {
          minLevel: "warn",
          sources: null,
          fingerprint: "abcdefgh",
        },
        { level: "error", source: "cron", fingerprint: "abcdefgh" },
      ),
    ).toBe(true);
    expect(
      ruleMatchesEvent(
        {
          minLevel: "warn",
          sources: null,
          fingerprint: "abcdefgh",
        },
        { level: "error", source: "cron", fingerprint: "other___" },
      ),
    ).toBe(false);
  });

  it("enforces threshold and cooldown", () => {
    const now = new Date("2026-09-29T12:00:00.000Z");
    expect(
      shouldFireAlert({
        matchingCount: 4,
        thresholdCount: 5,
        cooldownMinutes: 60,
        now,
      }),
    ).toBe(false);
    expect(
      shouldFireAlert({
        matchingCount: 5,
        thresholdCount: 5,
        lastFiredAt: "2026-09-29T11:30:00.000Z",
        cooldownMinutes: 60,
        now,
      }),
    ).toBe(false);
    expect(
      shouldFireAlert({
        matchingCount: 5,
        thresholdCount: 5,
        lastFiredAt: "2026-09-29T10:00:00.000Z",
        cooldownMinutes: 60,
        now,
      }),
    ).toBe(true);
    expect(isWithinCooldown(null, 60, now)).toBe(false);
  });

  it("reads OBSERVABILITY_ALERTS_ENABLED", () => {
    expect(isObservabilityAlertsEnabled({ OBSERVABILITY_ALERTS_ENABLED: "true" })).toBe(
      true,
    );
    expect(isObservabilityAlertsEnabled({ OBSERVABILITY_ALERTS_ENABLED: "no" })).toBe(
      false,
    );
  });
});
