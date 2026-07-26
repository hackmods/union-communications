import type { BumpingCaseWithRelations } from "@/types/bumping";
import type { GrievanceWithRelations } from "@/types/grievance";
import type { TimeEntry } from "@/types/time";
import {
  HYBRID_SLICE_VERSION,
  HYBRID_SLICE_VERSION_LEGACY,
  type HybridDataSlice,
} from "./types";

export function buildHybridSlice(input: {
  unionId: string;
  localId: string;
  grievances: GrievanceWithRelations[];
  bumpingCases: BumpingCaseWithRelations[];
  timeEntries?: TimeEntry[];
}): HybridDataSlice {
  return {
    version: HYBRID_SLICE_VERSION,
    exportedAt: new Date().toISOString(),
    unionId: input.unionId,
    localId: input.localId,
    grievances: input.grievances,
    bumpingCases: input.bumpingCases,
    timeEntries: input.timeEntries ?? [],
  };
}

function isTimeEntryArray(value: unknown): value is TimeEntry[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (e) =>
      e &&
      typeof e === "object" &&
      typeof (e as TimeEntry).id === "string" &&
      typeof (e as TimeEntry).workerId === "string",
  );
}

export function isHybridDataSlice(value: unknown): value is HybridDataSlice {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  const versionOk =
    s.version === HYBRID_SLICE_VERSION ||
    s.version === HYBRID_SLICE_VERSION_LEGACY;
  if (!versionOk) return false;
  if (
    s.timeEntries !== undefined &&
    s.timeEntries !== null &&
    !isTimeEntryArray(s.timeEntries)
  ) {
    return false;
  }
  return (
    typeof s.exportedAt === "string" &&
    typeof s.unionId === "string" &&
    typeof s.localId === "string" &&
    Array.isArray(s.grievances) &&
    Array.isArray(s.bumpingCases)
  );
}

/** Reject cross-tenant rows before import. */
export function assertSliceTenantScope(
  slice: HybridDataSlice,
  unionId: string,
  localId: string,
): void {
  if (slice.unionId !== unionId || slice.localId !== localId) {
    throw new Error("Slice tenant does not match your local");
  }
  for (const item of slice.grievances) {
    const g = item.grievance;
    if (!g || g.unionId !== unionId || g.localId !== localId) {
      throw new Error("Grievance in slice belongs to another tenant");
    }
  }
  for (const item of slice.bumpingCases) {
    const c = item.bumpingCase;
    if (!c || c.unionId !== unionId || c.localId !== localId) {
      throw new Error("Bumping case in slice belongs to another tenant");
    }
  }
  for (const entry of slice.timeEntries ?? []) {
    if (entry.unionId !== unionId || entry.localId !== localId) {
      throw new Error("Time entry in slice belongs to another tenant");
    }
  }
}
