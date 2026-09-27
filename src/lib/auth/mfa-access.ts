import type { Session } from "next-auth";
import { actorHasHostedMfaCapability, type AuthorizationActor } from "@/lib/authorization/model";
import { isHostedCustomerMode, sessionMfaOk } from "@/lib/auth/mfa-policy";

/**
 * Checks both the signed-in session policy and current database-backed
 * authority. Current delegations/circle administration can require MFA even
 * when the JWT was minted before that authority was granted.
 */
export function sessionHasMfaForActor(
  session: Session | null | undefined,
  actor: AuthorizationActor,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  hasCurrentCircleAdminAuthority = false,
): boolean {
  if (!sessionMfaOk(session, env)) return false;
  if (
    !isHostedCustomerMode(env) ||
    (!hasCurrentCircleAdminAuthority && !actorHasHostedMfaCapability(actor))
  ) {
    return true;
  }
  return Boolean(session?.user?.mfaVerified && actor.mfaVerified);
}
