/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptHybridSlice } from "@/lib/hybrid/encrypt";
import {
  HYBRID_LOCAL_SLICE_KEY,
  HYBRID_MODE_KEY,
  LocalHybridSliceAdapter,
} from "@/lib/hybrid/local-slice-adapter";
import {
  createGrievanceInSlice,
  listGrievancesFromSlice,
  updateGrievanceInSlice,
} from "@/lib/hybrid/local-case-store";
import {
  clearLiveHybridSession,
  getLiveHybridSlice,
  isLiveHybridUnlocked,
  mutateLiveHybridSlice,
  resetLiveHybridSessionForTests,
  unlockLiveHybridSession,
} from "@/lib/hybrid/live-session";
import { buildHybridSlice } from "@/lib/hybrid/slice";
import type { GrievanceWithRelations } from "@/types/grievance";

const sampleGrievance: GrievanceWithRelations = {
  grievance: {
    id: "grev-test",
    unionId: "union-opseu",
    localId: "local-243",
    category: "Discipline",
    status: "open",
    currentStep: 1,
    filedAt: "2026-01-01T00:00:00.000Z",
    assignedStewardId: "user-steward-243",
    createdById: "user-president-243",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  events: [
    {
      id: "evt-1",
      grievanceId: "grev-test",
      type: "step_filed",
      stepNumber: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  notes: [],
};

describe("hybrid live-local session", () => {
  let store: Map<string, string>;
  let adapter: LocalHybridSliceAdapter;

  beforeEach(() => {
    resetLiveHybridSessionForTests();
    store = new Map();
    adapter = new LocalHybridSliceAdapter();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      }),
    });
    vi.stubGlobal("crypto", globalThis.crypto);
    if (!globalThis.crypto.randomUUID) {
      Object.defineProperty(globalThis.crypto, "randomUUID", {
        configurable: true,
        value: () => "00000000-0000-4000-8000-000000000001",
      });
    } else {
      vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
        "00000000-0000-4000-8000-000000000001",
      );
    }
  });

  afterEach(() => {
    resetLiveHybridSessionForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("defaults to central mode and is not unlocked", async () => {
    expect(await adapter.getDataMode()).toBe("central");
    expect(isLiveHybridUnlocked()).toBe(false);
    expect(await adapter.isLiveLocalActive()).toBe(false);
  });

  it("switches to local mode only while unlocked session exists", async () => {
    const slice = buildHybridSlice({
      unionId: "union-opseu",
      localId: "local-243",
      grievances: [sampleGrievance],
      bumpingCases: [],
    });
    const encrypted = await encryptHybridSlice(slice, "hybrid-pass-123");
    await adapter.saveEncryptedSlice(encrypted);
    await adapter.setDataMode("local");

    expect(await adapter.getDataMode()).toBe("local");
    expect(await adapter.isLiveLocalActive()).toBe(false);

    unlockLiveHybridSession(slice, "hybrid-pass-123");
    expect(isLiveHybridUnlocked()).toBe(true);
    expect(await adapter.isLiveLocalActive()).toBe(true);
    expect(getLiveHybridSlice()?.grievances).toHaveLength(1);
  });

  it("clears live session when switching back to central", async () => {
    const slice = buildHybridSlice({
      unionId: "union-opseu",
      localId: "local-243",
      grievances: [sampleGrievance],
      bumpingCases: [],
    });
    unlockLiveHybridSession(slice, "hybrid-pass-123");
    await adapter.setDataMode("local");
    expect(isLiveHybridUnlocked()).toBe(true);

    await adapter.setDataMode("central");
    expect(isLiveHybridUnlocked()).toBe(false);
    expect(store.get(HYBRID_MODE_KEY)).toBe("central");
  });

  it("mutates slice CRUD and re-encrypts to localStorage", async () => {
    const slice = buildHybridSlice({
      unionId: "union-opseu",
      localId: "local-243",
      grievances: [sampleGrievance],
      bumpingCases: [],
    });
    unlockLiveHybridSession(slice, "hybrid-pass-123");
    await adapter.setDataMode("local");

    await mutateLiveHybridSlice((draft) => {
      const created = createGrievanceInSlice(
        draft,
        {
          category: "Scheduling",
          filedAt: "2026-02-01T00:00:00.000Z",
          memberPseudonym: "Member Z",
        },
        {
          unionId: "union-opseu",
          localId: "local-243",
          userId: "user-1",
          authorName: "Officer",
        },
      );
      draft.grievances = created.slice.grievances;
    });

    const live = getLiveHybridSlice();
    expect(live?.grievances).toHaveLength(2);
    expect(listGrievancesFromSlice(live!).map((g) => g.category)).toContain(
      "Scheduling",
    );
    expect(store.has(HYBRID_LOCAL_SLICE_KEY)).toBe(true);

    await mutateLiveHybridSlice((draft) => {
      const next = updateGrievanceInSlice(draft, "grev-test", {
        status: "resolved",
        resolvedAt: "2026-03-01T00:00:00.000Z",
      });
      if (next) draft.grievances = next.grievances;
    });
    expect(
      getLiveHybridSlice()?.grievances.find((g) => g.grievance.id === "grev-test")
        ?.grievance.status,
    ).toBe("resolved");
  });

  it("clearEncryptedSlice also clears the live session", async () => {
    const slice = buildHybridSlice({
      unionId: "union-opseu",
      localId: "local-243",
      grievances: [sampleGrievance],
      bumpingCases: [],
    });
    const encrypted = await encryptHybridSlice(slice, "hybrid-pass-123");
    await adapter.saveEncryptedSlice(encrypted);
    unlockLiveHybridSession(slice, "hybrid-pass-123");
    await adapter.clearEncryptedSlice();
    expect(isLiveHybridUnlocked()).toBe(false);
    expect(await adapter.getEncryptedSlice()).toBeNull();
  });

  it("clearLiveHybridSession leaves encrypted blob and mode intact", async () => {
    const slice = buildHybridSlice({
      unionId: "union-opseu",
      localId: "local-243",
      grievances: [sampleGrievance],
      bumpingCases: [],
    });
    const encrypted = await encryptHybridSlice(slice, "hybrid-pass-123");
    await adapter.saveEncryptedSlice(encrypted);
    await adapter.setDataMode("local");
    unlockLiveHybridSession(slice, "hybrid-pass-123");
    clearLiveHybridSession();
    expect(isLiveHybridUnlocked()).toBe(false);
    expect(await adapter.getDataMode()).toBe("local");
    expect(await adapter.getEncryptedSlice()).not.toBeNull();
  });
});
