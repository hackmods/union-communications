import { isPostgresConfigured } from "@/lib/db/client";
import type { PasswordResetAdapter } from "./password-reset-adapter";
import { DrizzlePasswordResetAdapter } from "./password-reset-drizzle-adapter";
import { memoryPasswordResetStore } from "./password-reset-memory-adapter";

let store: PasswordResetAdapter | null = null;

function usersBackendEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres" &&
    isPostgresConfigured(env)
  );
}

/**
 * Singleton password-reset store — memory by default;
 * Postgres when AUTH_USERS_BACKEND=postgres (+ DATABASE_URL).
 */
export function getPasswordResetStore(): PasswordResetAdapter {
  if (!store) {
    store = usersBackendEnabled()
      ? new DrizzlePasswordResetAdapter()
      : memoryPasswordResetStore;
  }
  return store;
}

/** @internal test helper — drop singleton so next get re-resolves backend */
export function resetPasswordResetStore(): void {
  store?.resetForTests?.();
  store = null;
}

export const passwordResetStore: PasswordResetAdapter = new Proxy(
  {} as PasswordResetAdapter,
  {
    get(_target, prop, receiver) {
      const impl = getPasswordResetStore();
      const value = Reflect.get(impl, prop, receiver);
      return typeof value === "function" ? value.bind(impl) : value;
    },
  },
);
