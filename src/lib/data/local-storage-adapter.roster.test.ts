import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_ROSTER_KEY } from "./adapter";
import { LocalStorageAdapter } from "./local-storage-adapter";
import { defaultPublicRoster, stampRoster } from "@/lib/org-chart";

describe("LocalStorageAdapter public roster", () => {
  let adapter: LocalStorageAdapter;
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    adapter = new LocalStorageAdapter();
    adapter.resetForTests();

    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("saves and loads officers and stewards on-device", async () => {
    const roster = stampRoster([
      {
        id: "p1",
        name: "Ada",
        role: "President",
        location: "",
        group: "executive",
        showOnWebsite: true,
      },
    ]);

    await adapter.savePublicRoster(roster);
    expect(store.has(PUBLIC_ROSTER_KEY)).toBe(true);

    const loaded = await adapter.getPublicRoster();
    expect(loaded?.people).toEqual(roster.people);
  });

  it("returns null for a Brand Kit file stored under the roster key", async () => {
    store.set(
      PUBLIC_ROSTER_KEY,
      JSON.stringify({
        version: "2.0",
        local: { localNumber: "243" },
        primaryColor: "#003DA5",
      }),
    );

    expect(await adapter.getPublicRoster()).toBeNull();
  });

  it("keeps a session copy when setItem throws (TOOL-001)", async () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    const roster = defaultPublicRoster();
    await expect(adapter.savePublicRoster(roster)).resolves.toBeUndefined();
    expect(adapter.isPersistenceBlocked()).toBe(true);

    const loaded = await adapter.getPublicRoster();
    expect(loaded?.people.map((row) => row.id)).toEqual(
      roster.people.map((row) => row.id),
    );
  });
});
