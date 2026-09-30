import { describe, expect, it } from "vitest";
import {
  computeFingerprint,
  normalizeFingerprintMessage,
} from "@/lib/observability/fingerprint";
import {
  resolveSincePreset,
  summarizeEvents,
} from "@/lib/observability/summarize";
import { buildObservabilityExport } from "@/lib/observability/export-formats";
import type { ObservabilityEvent } from "@/lib/observability/types";

describe("fingerprint", () => {
  it("collapses UUIDs and numbers for stable grouping", () => {
    expect(normalizeFingerprintMessage("Failed id 550e8400-e29b-41d4-a716-446655440000 attempt 12")).toBe(
      "failed id <id> attempt <n>",
    );
    const a = computeFingerprint({
      level: "error",
      name: "Error",
      message: "boom on /api/x/111",
      route: "/api/x/111",
    });
    const b = computeFingerprint({
      level: "error",
      name: "Error",
      message: "boom on /api/x/222",
      route: "/api/x/222",
    });
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
  });
});

describe("summarizeEvents", () => {
  it("groups by fingerprint and ranks by count", () => {
    const events: ObservabilityEvent[] = [
      {
        id: "1",
        ts: "2026-09-29T10:00:00.000Z",
        level: "error",
        source: "server",
        message: "boom 1",
        fingerprint: "aaaa",
      },
      {
        id: "2",
        ts: "2026-09-29T11:00:00.000Z",
        level: "error",
        source: "server",
        message: "boom 2",
        fingerprint: "aaaa",
      },
      {
        id: "3",
        ts: "2026-09-29T12:00:00.000Z",
        level: "warn",
        source: "client",
        message: "drift",
        fingerprint: "bbbb",
      },
    ];
    const summary = summarizeEvents(events);
    expect(summary.total).toBe(3);
    expect(summary.byLevel.error).toBe(2);
    expect(summary.bySource.client).toBe(1);
    expect(summary.byFingerprint[0]?.fingerprint).toBe("aaaa");
    expect(summary.byFingerprint[0]?.count).toBe(2);
  });
});

describe("resolveSincePreset", () => {
  it("maps 1h/24h/7d", () => {
    const now = new Date("2026-09-29T12:00:00.000Z");
    expect(resolveSincePreset("1h", now)).toBe("2026-09-29T11:00:00.000Z");
    expect(resolveSincePreset("24h", now)).toBe("2026-09-28T12:00:00.000Z");
    expect(resolveSincePreset(undefined, now)).toBeUndefined();
  });
});

describe("buildObservabilityExport", () => {
  it("builds incident-pack ZIP with PK header", async () => {
    const events: ObservabilityEvent[] = [
      {
        id: "1",
        ts: "2026-09-29T10:00:00.000Z",
        level: "error",
        source: "server",
        message: "boom",
        fingerprint: "abcd",
      },
    ];
    const pack = await buildObservabilityExport(events, "incident-pack");
    expect(pack.contentType).toBe("application/zip");
    expect(Buffer.isBuffer(pack.body)).toBe(true);
    const buf = pack.body as Buffer;
    expect(buf[0]).toBe(0x50); // P
    expect(buf[1]).toBe(0x4b); // K
  });
});
