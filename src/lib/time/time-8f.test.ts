import { beforeEach, describe, expect, it } from "vitest";
import { buildHybridSlice, isHybridDataSlice } from "@/lib/hybrid/slice";
import { memoryTimeStore } from "@/lib/time/memory-adapter";
import { validatePunchPhoto } from "@/lib/time/punch-photo";
import { resetTimeStore } from "@/lib/time/store";
import type { TimeEntry } from "@/types/time";

const sampleEntry: TimeEntry = {
  id: "time-hybrid-1",
  unionId: "union-opseu",
  localId: "local-243",
  workerId: "user-steward-243",
  workerName: "Steward",
  category: "release",
  jobCodeId: "code-release-grievance",
  jobCodeLabel: "Grievance",
  status: "approved",
  entrySource: "clock",
  clockInAt: "2030-01-01T09:00:00.000Z",
  clockOutAt: "2030-01-01T17:00:00.000Z",
  createdAt: "2030-01-01T09:00:00.000Z",
  updatedAt: "2030-01-01T17:00:00.000Z",
};

describe("Time 8f — hybrid slice", () => {
  it("builds slice v1.1 with time entries", () => {
    const slice = buildHybridSlice({
      unionId: "union-opseu",
      localId: "local-243",
      grievances: [],
      bumpingCases: [],
      timeEntries: [sampleEntry],
    });
    expect(slice.version).toBe("1.1");
    expect(isHybridDataSlice(slice)).toBe(true);
    expect(slice.timeEntries).toHaveLength(1);
  });

  it("accepts legacy v1.0 slices without time entries", () => {
    const legacy = {
      version: "1.0",
      exportedAt: "2030-01-01T00:00:00.000Z",
      unionId: "union-opseu",
      localId: "local-243",
      grievances: [],
      bumpingCases: [],
    };
    expect(isHybridDataSlice(legacy)).toBe(true);
  });
});

describe("Time 8f — punch photo validation", () => {
  it("rejects non-image mime types", () => {
    const err = validatePunchPhoto({
      fileName: "doc.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      contentBase64: "aGVsbG8=",
      kind: "clock_in",
    });
    expect(err).toMatch(/JPEG|PNG|WebP/i);
  });
});

describe("Time 8f — importLocalSlice", () => {
  beforeEach(() => {
    resetTimeStore();
  });

  it("merges hybrid time entries", async () => {
    const result = await memoryTimeStore.importLocalSlice(
      "union-opseu",
      "local-243",
      [sampleEntry],
      "merge",
    );
    expect(result.imported).toBe(1);
    const listed = await memoryTimeStore.listEntries({
      unionId: "union-opseu",
      localId: "local-243",
    });
    expect(listed.some((e) => e.id === sampleEntry.id)).toBe(true);
  });
});
