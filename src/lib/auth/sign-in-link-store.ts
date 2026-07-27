import { isPostgresConfigured } from "@/lib/db/client";
import type { SignInTokenAdapter } from "./sign-in-link-adapter";
import { DrizzleSignInTokenAdapter } from "./sign-in-link-drizzle-adapter";
import { memorySignInTokenStore } from "./sign-in-link-memory-adapter";

let store: SignInTokenAdapter | null = null;

function usersBackendEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres" &&
    isPostgresConfigured(env)
  );
}

export function getSignInTokenStore(): SignInTokenAdapter {
  if (!store) {
    store = usersBackendEnabled()
      ? new DrizzleSignInTokenAdapter()
      : memorySignInTokenStore;
  }
  return store;
}

/** @internal test helper */
export function resetSignInTokenStore(): void {
  store?.resetForTests?.();
  store = null;
}
