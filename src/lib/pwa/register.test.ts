import { describe, expect, it, vi } from "vitest";
import {
  syncServiceWorkerRegistration,
  type ServiceWorkerContainerLike,
} from "./register";
import { PWA_SERVICE_WORKER_URL } from "./shell";

function mockContainer(options?: {
  registerImpl?: () => Promise<unknown>;
  registrations?: Array<{ unregister: () => Promise<boolean> }>;
}): ServiceWorkerContainerLike & {
  register: ReturnType<typeof vi.fn>;
  getRegistrations: ReturnType<typeof vi.fn>;
} {
  const unregister =
    options?.registrations ??
    ([] as Array<{ unregister: () => Promise<boolean> }>);
  return {
    register: vi.fn(options?.registerImpl ?? (async () => ({}))),
    getRegistrations: vi.fn(async () => unregister),
  };
}

describe("syncServiceWorkerRegistration", () => {
  it("skips when serviceWorker is missing", async () => {
    await expect(
      syncServiceWorkerRegistration({
        hostname: "unionops.org",
        serviceWorker: undefined,
      }),
    ).resolves.toBe("skipped");
    await expect(
      syncServiceWorkerRegistration({
        hostname: "unionops.org",
        serviceWorker: null,
      }),
    ).resolves.toBe("skipped");
  });

  it("registers /sw.js on production hosts", async () => {
    const sw = mockContainer();
    await expect(
      syncServiceWorkerRegistration({
        hostname: "unionops.org",
        serviceWorker: sw,
      }),
    ).resolves.toBe("registered");
    expect(sw.register).toHaveBeenCalledWith(PWA_SERVICE_WORKER_URL);
    expect(sw.getRegistrations).not.toHaveBeenCalled();
  });

  it("registers on www production host with a custom script URL", async () => {
    const sw = mockContainer();
    await expect(
      syncServiceWorkerRegistration({
        hostname: "www.unionops.org",
        serviceWorker: sw,
        scriptURL: "/custom-sw.js",
      }),
    ).resolves.toBe("registered");
    expect(sw.register).toHaveBeenCalledWith("/custom-sw.js");
  });

  it("unregisters existing SWs on non-production hosts", async () => {
    const unregisterA = vi.fn(async () => true);
    const unregisterB = vi.fn(async () => true);
    const sw = mockContainer({
      registrations: [{ unregister: unregisterA }, { unregister: unregisterB }],
    });

    await expect(
      syncServiceWorkerRegistration({
        hostname: "localhost",
        serviceWorker: sw,
      }),
    ).resolves.toBe("unregistered");

    expect(sw.register).not.toHaveBeenCalled();
    expect(sw.getRegistrations).toHaveBeenCalledOnce();
    expect(unregisterA).toHaveBeenCalledOnce();
    expect(unregisterB).toHaveBeenCalledOnce();
  });

  it("unregisters on staging-like hosts even with zero existing regs", async () => {
    const sw = mockContainer({ registrations: [] });
    await expect(
      syncServiceWorkerRegistration({
        hostname: "staging.example.com",
        serviceWorker: sw,
      }),
    ).resolves.toBe("unregistered");
    expect(sw.register).not.toHaveBeenCalled();
  });
});
