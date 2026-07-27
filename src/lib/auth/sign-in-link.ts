/**
 * Magic sign-in link tokens — memory by default; durable Postgres when
 * AUTH_USERS_BACKEND=postgres (+ DATABASE_URL).
 */

export type {
  ConsumeSignInResult,
  SignInToken,
} from "./sign-in-link-adapter";

import {
  getSignInTokenStore,
  resetSignInTokenStore,
} from "./sign-in-link-store";
import type {
  ConsumeSignInResult,
  SignInToken,
} from "./sign-in-link-adapter";

export async function createSignInToken(input: {
  email: string;
  userId: string;
  ttlHours?: number;
}): Promise<SignInToken> {
  return getSignInTokenStore().createToken(input);
}

export async function getSignInToken(
  token: string,
): Promise<SignInToken | null> {
  return getSignInTokenStore().getToken(token);
}

export async function consumeSignInToken(
  token: string,
): Promise<ConsumeSignInResult> {
  return getSignInTokenStore().consumeToken(token);
}

/** @internal test helper */
export function resetSignInTokenStoreForTests(): void {
  resetSignInTokenStore();
}
