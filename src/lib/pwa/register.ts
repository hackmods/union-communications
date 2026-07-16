import { shouldRegisterServiceWorker } from "./hosts";
import { PWA_SERVICE_WORKER_URL } from "./shell";

export type ServiceWorkerRegistrationLike = {
  unregister: () => Promise<boolean>;
};

export type ServiceWorkerContainerLike = {
  register: (scriptURL: string) => Promise<unknown>;
  getRegistrations: () => Promise<ServiceWorkerRegistrationLike[]>;
};

export type SyncServiceWorkerResult =
  | "registered"
  | "unregistered"
  | "skipped";

/**
 * Register the offline shell on production hosts; unregister everywhere else.
 * Pure of React / window so unit tests can drive the branch table.
 */
export async function syncServiceWorkerRegistration(options: {
  hostname: string;
  serviceWorker: ServiceWorkerContainerLike | undefined | null;
  scriptURL?: string;
}): Promise<SyncServiceWorkerResult> {
  const { serviceWorker } = options;
  if (!serviceWorker) {
    return "skipped";
  }

  if (!shouldRegisterServiceWorker(options.hostname)) {
    const regs = await serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
    return "unregistered";
  }

  await serviceWorker.register(options.scriptURL ?? PWA_SERVICE_WORKER_URL);
  return "registered";
}
