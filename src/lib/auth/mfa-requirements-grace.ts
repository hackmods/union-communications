/**
 * Async MFA requirement that honors durable re-enroll grace.
 * Server-only — imports Postgres-backed grace helpers.
 */

import "server-only";

import { isMfaReenrollGraceActive } from "@/lib/auth/mfa-reenroll-grace";
import { sessionRequiresMfa } from "@/lib/auth/mfa-requirements";

export async function sessionRequiresMfaWithGrace(
  user: {
    id?: string | null;
    email?: string | null;
    roles?: readonly string[] | null;
    mfaRequired?: boolean | null;
  } | null | undefined,
  mfaEnabled: boolean,
  hostedCustomerMode: boolean,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  const base = sessionRequiresMfa(user, mfaEnabled, hostedCustomerMode, env);
  if (!base) return false;
  if (
    user?.id &&
    (await isMfaReenrollGraceActive(user.id, Date.now(), env as NodeJS.ProcessEnv))
  ) {
    return false;
  }
  return true;
}
