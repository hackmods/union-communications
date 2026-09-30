import { describe, expect, it } from "vitest";
import {
  resolveRecipientBuckets,
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

  it("matches sources, fingerprint, and union", () => {
    expect(
      ruleMatchesEvent(
        {
          minLevel: "error",
          sources: ["server"],
          fingerprint: null,
          unionId: null,
        },
        { level: "error", source: "client" },
      ),
    ).toBe(false);
    expect(
      ruleMatchesEvent(
        {
          minLevel: "warn",
          sources: null,
          fingerprint: null,
          unionId: "u-1",
        },
        { level: "error", source: "cron", unionId: "u-1" },
      ),
    ).toBe(true);
    expect(
      ruleMatchesEvent(
        {
          minLevel: "warn",
          sources: null,
          fingerprint: null,
          unionId: "u-1",
        },
        { level: "error", source: "cron", unionId: "u-2" },
      ),
    ).toBe(false);
  });

  it("fans out recipients by union for host-wide rules", () => {
    const buckets = resolveRecipientBuckets({
      rule: {
        unionId: null,
        recipients: ["ops@example.org"],
        recipientsByUnion: {
          "u-a": ["a@example.org"],
          "u-b": ["b@example.org"],
        },
      },
      eventUnionIds: ["u-a", "u-a", "u-b", null],
    });
    expect(buckets).toEqual(
      expect.arrayContaining([
        { unionId: "u-a", recipients: ["a@example.org"] },
        { unionId: "u-b", recipients: ["b@example.org"] },
        { unionId: null, recipients: ["ops@example.org"] },
      ]),
    );
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
    expect(
      isObservabilityAlertsEnabled({ OBSERVABILITY_ALERTS_ENABLED: "true" }),
    ).toBe(true);
    expect(
      isObservabilityAlertsEnabled({ OBSERVABILITY_ALERTS_ENABLED: "no" }),
    ).toBe(false);
  });
});
