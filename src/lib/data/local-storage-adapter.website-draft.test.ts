import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WEBSITE_DRAFT_KEY } from "./adapter";
import { LocalStorageAdapter } from "./local-storage-adapter";
import { emptyWebsiteDraft } from "@/types/website-draft";

describe("LocalStorageAdapter website draft", () => {
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

  it("saves and loads page copy on-device", async () => {
    const draft = emptyWebsiteDraft({
      unionName: "Local 7",
      heroText: "Solidarity",
      about1: "We bargain.",
    });
    await adapter.saveWebsiteDraft(draft);
    expect(store.has(WEBSITE_DRAFT_KEY)).toBe(true);
    const loaded = await adapter.getWebsiteDraft();
    expect(loaded?.unionName).toBe("Local 7");
    expect(loaded?.heroText).toBe("Solidarity");
  });

  it("returns null for garbage under the draft key", async () => {
    store.set(WEBSITE_DRAFT_KEY, "{not-json");
    expect(await adapter.getWebsiteDraft()).toBeNull();
  });
});
