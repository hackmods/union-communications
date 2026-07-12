import { describe, it, expect } from "vitest";
import {
  canAdminTime,
  canApproveTimeEntry,
  canClockTime,
  canSubmitTimeEntry,
  canViewTimeEntry,
} from "@/lib/time/access";
import { checkGeofence, haversineDistanceM } from "@/lib/time/geofence";
import type { TimeEntry, WorkSite } from "@/types/time";

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
