import { describe, it, expect } from "vitest";
import {
  canAdminTime,
  canApproveTimeEntry,
  canClockTime,
  canSubmitTimeEntry,
  canViewTimeEntry,
} from "@/lib/time/access";
import { checkGeofence, haversineDistanceM } from "@/lib/time/geofence";
import {
  computeNeededEntries,
  hasOverlappingEntry,
  rangesOverlap,
} from "@/lib/time/needed";
import type {
  TimeEntry,
  TimeExpectedWindow,
  TimeWorker,
  WorkSite,
} from "@/types/time";

const sampleEntry: TimeEntry = {
  id: "time-0001",
  unionId: "union-opseu",
  localId: "local-243",
  workerId: "user-steward-243",
  workerName: "Steward",
  category: "release",
  jobCodeId: "code-release-grievance",
  jobCodeLabel: "Grievance handling",
  status: "completed",
  entrySource: "clock",
  clockInAt: "2026-07-12T10:00:00.000Z",
  clockOutAt: "2026-07-12T12:00:00.000Z",
  createdAt: "2026-07-12T10:00:00.000Z",
  updatedAt: "2026-07-12T12:00:00.000Z",
};

describe("time access", () => {
  it("allows steward to view own entry", () => {
    expect(
      canViewTimeEntry(
        sampleEntry,
        "user-steward-243",
        "union-opseu",
        "local-243",
        ["local_steward"],
      ),
    ).toBe(true);
  });

  it("blocks steward from viewing another worker entry", () => {
    expect(
      canViewTimeEntry(
        sampleEntry,
        "user-other",
        "union-opseu",
        "local-243",
        ["local_steward"],
      ),
    ).toBe(false);
  });

  it("allows president to approve submitted entries", () => {
    const submitted = { ...sampleEntry, status: "submitted" as const };
    expect(canAdminTime(["local_president"])).toBe(true);
    expect(
      canApproveTimeEntry(
        submitted,
        "user-president-243",
        "union-opseu",
        "local-243",
        ["local_president"],
      ),
    ).toBe(true);
  });

  it("allows worker to submit completed entry", () => {
    expect(
      canSubmitTimeEntry(
        sampleEntry,
        "user-steward-243",
        "union-opseu",
        "local-243",
        ["local_steward"],
      ),
    ).toBe(true);
    expect(canClockTime(["local_steward"])).toBe(true);
  });

  it("blocks cross-local access for president", () => {
    expect(
      canViewTimeEntry(
        sampleEntry,
        "user-president-243",
        "union-opseu",
        "local-999",
        ["local_president"],
      ),
    ).toBe(false);
  });
});

describe("geofence", () => {
  const site: WorkSite = {
    id: "site-1",
    unionId: "union-opseu",
    localId: "local-243",
    name: "Office",
    lat: 43.6532,
    lng: -79.3832,
    geofenceRadiusM: 500,
    geofenceMode: "block",
    active: true,
  };

  it("returns ok when inside radius", () => {
    expect(
      checkGeofence(
        { lat: 43.6533, lng: -79.3833, capturedAt: new Date().toISOString() },
        [site],
      ),
    ).toBe("ok");
  });

  it("returns block when outside radius with block mode", () => {
    expect(
      checkGeofence(
        { lat: 44.0, lng: -80.0, capturedAt: new Date().toISOString() },
        [site],
      ),
    ).toBe("block");
  });

  it("computes haversine distance", () => {
    const d = haversineDistanceM(43.6532, -79.3832, 44.0, -80.0);
    expect(d).toBeGreaterThan(50_000);
  });
});

describe("time ranges and needed", () => {
  it("detects overlapping ranges", () => {
    expect(
      rangesOverlap(
        "2026-07-12T10:00:00.000Z",
        "2026-07-12T12:00:00.000Z",
        "2026-07-12T11:00:00.000Z",
        "2026-07-12T13:00:00.000Z",
      ),
    ).toBe(true);
    expect(
      rangesOverlap(
        "2026-07-12T10:00:00.000Z",
        "2026-07-12T11:00:00.000Z",
        "2026-07-12T11:00:00.000Z",
        "2026-07-12T12:00:00.000Z",
      ),
    ).toBe(false);
  });

  it("rejects overlapping entries for the same worker", () => {
    expect(
      hasOverlappingEntry(
        [sampleEntry],
        "user-steward-243",
        "2026-07-12T11:30:00.000Z",
        "2026-07-12T13:00:00.000Z",
      ),
    ).toBe(true);
    expect(
      hasOverlappingEntry(
        [sampleEntry],
        "user-steward-243",
        "2026-07-12T13:00:00.000Z",
        "2026-07-12T14:00:00.000Z",
      ),
    ).toBe(false);
  });

  it("flags missing expected-window attendees", () => {
    const workers: TimeWorker[] = [
      {
        id: "tw-steward-243",
        unionId: "union-opseu",
        localId: "local-243",
        displayName: "Steward",
        userId: "user-steward-243",
        trackGaps: false,
        active: true,
      },
    ];
    const windows: TimeExpectedWindow[] = [
      {
        id: "twin-1",
        unionId: "union-opseu",
        localId: "local-243",
        label: "Exec meeting",
        startsAt: "2026-07-15T14:00:00.000Z",
        endsAt: "2026-07-15T16:00:00.000Z",
        category: "release",
        attendeeWorkerIds: ["tw-steward-243"],
        createdById: "user-president-243",
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ];
    const needed = computeNeededEntries({
      workers,
      windows,
      entries: [],
      from: "2026-07-14T00:00:00.000Z",
      to: "2026-07-16T00:00:00.000Z",
    });
    expect(needed).toHaveLength(1);
    expect(needed[0].kind).toBe("expected_window");
    expect(needed[0].windowLabel).toBe("Exec meeting");
  });

  it("flags weekday gaps when trackGaps is on", () => {
    const workers: TimeWorker[] = [
      {
        id: "tw-staff",
        unionId: "union-opseu",
        localId: "local-243",
        displayName: "Staff",
        userId: "user-staff",
        trackGaps: true,
        active: true,
      },
    ];
    // Monday 2026-07-13 through Wednesday 2026-07-15 (UTC)
    const needed = computeNeededEntries({
      workers,
      windows: [],
      entries: [],
      from: "2026-07-13T00:00:00.000Z",
      to: "2026-07-15T23:59:59.000Z",
    });
    expect(needed.every((n) => n.kind === "weekday_gap")).toBe(true);
    expect(needed).toHaveLength(3);
  });

  it("does not flag weekday gap when entry covers the day", () => {
    const workers: TimeWorker[] = [
      {
        id: "tw-staff",
        unionId: "union-opseu",
        localId: "local-243",
        displayName: "Staff",
        userId: "user-staff",
        trackGaps: true,
        active: true,
      },
    ];
    const entry: TimeEntry = {
      ...sampleEntry,
      id: "time-staff",
      workerId: "user-staff",
      workerName: "Staff",
      clockInAt: "2026-07-13T09:00:00.000Z",
      clockOutAt: "2026-07-13T17:00:00.000Z",
      entrySource: "manual_range",
      status: "approved",
    };
    const needed = computeNeededEntries({
      workers,
      windows: [],
      entries: [entry],
      from: "2026-07-13T00:00:00.000Z",
      to: "2026-07-13T23:59:59.000Z",
    });
    expect(needed).toHaveLength(0);
  });
});
