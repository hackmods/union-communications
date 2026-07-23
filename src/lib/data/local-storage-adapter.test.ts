import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BRAND_KIT_KEY,
  LEGACY_BRAND_KIT_KEY,
  LEGACY_ONBOARDING_KEY,
  ONBOARDING_KEY,
} from "./adapter";
import { LocalStorageAdapter } from "./local-storage-adapter";

const v11Kit = {
  version: "1.1",
  local: { id: "local-1", localNumber: "243", subText: "Support" },
  primaryColor: "#003DA5",
  secondaryColor: "#FFFFFF",
  accentColor: "#002868",
  useOfficialLogo: true,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("LocalStorageAdapter", () => {
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

  it("saves and loads a brand kit under the canonical key", async () => {
    await adapter.saveBrandKit(v11Kit as never);
    expect(store.has(BRAND_KIT_KEY)).toBe(true);
    expect(store.has(LEGACY_BRAND_KIT_KEY)).toBe(false);

    const loaded = await adapter.getBrandKit();
    expect(loaded?.version).toBe("2.0");
    expect(loaded?.local.localNumber).toBe("243");
  });

  it("degrades gracefully when setItem throws QuotaExceededError (TOOL-001)", async () => {
    const quotaError = new DOMException(
      "Quota exceeded",
      "QuotaExceededError",
    );
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw quotaError;
    });

    await expect(adapter.saveBrandKit(v11Kit as never)).resolves.toBeUndefined();
    expect(adapter.isPersistenceBlocked()).toBe(true);

    const loaded = await adapter.getBrandKit();
    expect(loaded?.local.localNumber).toBe("243");
    expect(loaded?.version).toBe("2.0");
  });

  it("degrades gracefully when setItem throws SecurityError (TOOL-001)", async () => {
    const securityError = new DOMException("Denied", "SecurityError");
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw securityError;
    });

    await expect(adapter.saveBrandKit(v11Kit as never)).resolves.toBeUndefined();
    expect(adapter.isPersistenceBlocked()).toBe(true);
  });

  it("falls back to memory when getItem throws", async () => {
    await adapter.saveBrandKit(v11Kit as never);
    vi.mocked(localStorage.getItem).mockImplementation(() => {
      throw new DOMException("Denied", "SecurityError");
    });

    const loaded = await adapter.getBrandKit();
    expect(loaded?.local.localNumber).toBe("243");
  });

  it("writes normalized v2 kit back to storage on read (TOOL-006)", async () => {
    store.set(BRAND_KIT_KEY, JSON.stringify(v11Kit));

    const loaded = await adapter.getBrandKit();
    expect(loaded?.version).toBe("2.0");

    const raw = store.get(BRAND_KIT_KEY);
    expect(raw).toBeDefined();
    expect(JSON.parse(raw!).version).toBe("2.0");
  });

  it("migrates legacy opseu-brand-kit to the canonical key (TOOL-007)", async () => {
    store.set(LEGACY_BRAND_KIT_KEY, JSON.stringify(v11Kit));

    const loaded = await adapter.getBrandKit();
    expect(loaded?.local.localNumber).toBe("243");
    expect(store.has(BRAND_KIT_KEY)).toBe(true);
    expect(JSON.parse(store.get(BRAND_KIT_KEY)!).version).toBe("2.0");
    expect(store.has(LEGACY_BRAND_KIT_KEY)).toBe(false);
  });

  it("migrates legacy onboarding flag (TOOL-007)", async () => {
    store.set(LEGACY_ONBOARDING_KEY, "true");

    expect(await adapter.isOnboardingComplete()).toBe(true);
    expect(store.get(ONBOARDING_KEY)).toBe("true");
    expect(store.has(LEGACY_ONBOARDING_KEY)).toBe(false);
  });

  it("notifies persistence listeners once when blocked", async () => {
    const listener = vi.fn();
    adapter.subscribePersistenceBlocked(listener);
    expect(listener).toHaveBeenCalledWith(false);

    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    await adapter.saveBrandKit(v11Kit as never);
    await adapter.saveBrandKit(v11Kit as never);

    expect(listener).toHaveBeenCalledWith(true);
    expect(listener.mock.calls.filter((c) => c[0] === true)).toHaveLength(1);

    adapter.dismissPersistenceBlocked();
    expect(adapter.isPersistenceBlocked()).toBe(false);
    expect(listener).toHaveBeenLastCalledWith(false);
  });

  it("keeps clear in-session when removeItem throws but getItem still works", async () => {
    store.set(BRAND_KIT_KEY, JSON.stringify(v11Kit));
    vi.mocked(localStorage.removeItem).mockImplementation(() => {
      throw new DOMException("Denied", "SecurityError");
    });

    await adapter.clearBrandKit();
    expect(await adapter.getBrandKit()).toBeNull();
    expect(adapter.isPersistenceBlocked()).toBe(true);
  });
});
