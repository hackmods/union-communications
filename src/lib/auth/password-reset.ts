/**
 * Password-reset tokens — memory by default; durable Postgres when
 * AUTH_USERS_BACKEND=postgres (+ DATABASE_URL).
 */

export type {
  ConsumePasswordResetResult,
  PasswordResetToken,
} from "./password-reset-adapter";

import {
  getPasswordResetStore,
  resetPasswordResetStore,
} from "./password-reset-store";
import type {
  ConsumePasswordResetResult,
  PasswordResetToken,
} from "./password-reset-adapter";

export async function createPasswordResetToken(input: {
  email: string;
  userId: string;
  ttlHours?: number;
}): Promise<PasswordResetToken> {
  return getPasswordResetStore().createToken(input);
}

export async function getPasswordResetToken(
  token: string,
): Promise<PasswordResetToken | null> {
  return getPasswordResetStore().getToken(token);
}

export async function consumePasswordResetToken(
  token: string,
): Promise<ConsumePasswordResetResult> {
  return getPasswordResetStore().consumeToken(token);
}

/** @internal test helper */
export function resetPasswordResetStoreForTests(): void {
  resetPasswordResetStore();
}
