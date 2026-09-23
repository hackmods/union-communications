import { auth } from "@/auth";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { isMfaEnabled, resolveMfaMode } from "@/lib/auth/mfa-policy";
import { decideCustomizationManagement, type CustomizationCapability } from "@/lib/customization/authorization";
import { customizationRlsTarget } from "@/lib/customization/context";
import { decideWithMaintenanceGrant, isCustomizationDelegationEnabled } from "@/lib/customization/grants";
import { getCustomizationAdapter } from "@/lib/customization/store";
import type { CustomizationScope } from "@/lib/customization/types";

export function customizationConfigurationError(env: Record<string, string | undefined> = process.env): string | null {
  if (env.CUSTOMIZATION_ENABLED !== "true") return "Customization unavailable";
  const production = env.NODE_ENV === "production";
  const demo = !production && env.CUSTOMIZATION_ALLOW_MEMORY_DEMO === "true";
  if (!demo && (!env.DATABASE_URL || env.AUTH_USERS_BACKEND !== "postgres")) return "Durable customization and authentication must be configured";
  if (!isMfaEnabled(env) || !resolveMfaMode(env) || (production && resolveMfaMode(env) !== "totp")) return "Customization requires configured MFA";
  return null;
}

export async function requireCustomizationSession(target: CustomizationScope, capability: CustomizationCapability = "customization.edit") {
  const session = await auth();
  if (!session?.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const configurationError = customizationConfigurationError();
  if (configurationError) return { ok: false as const, status: 503, error: configurationError };
  const actor = await resolveAuthorizationActor(session);
  const allowDemoActor = process.env.NODE_ENV !== "production" && process.env.CUSTOMIZATION_ALLOW_MEMORY_DEMO === "true";
  let decision = decideCustomizationManagement(actor, capability, target, { allowDemoActor });

  // C13: when Root denies, optionally honour an active maintenance grant (flag-gated).
  if (!decision.allowed && isCustomizationDelegationEnabled() && actor.accountActive && target.kind !== "system") {
    try {
      const adapter = getCustomizationAdapter();
      const grants = await adapter.transaction(
        customizationRlsTarget(target, actor.userId, actor.mfaVerified),
        async (tx) => tx.read("grants", { userId: actor.userId, unionId: target.unionId }),
      );
      const grantDecision = decideWithMaintenanceGrant({
        actor,
        capability,
        target,
        grants: grants
          .filter((row) => typeof row.unionId === "string" && row.unionId.length > 0)
          .map((row) => ({
          id: row.id,
          userId: row.userId,
          unionId: row.unionId as string,
          scopeId: row.scopeId,
          capabilities: row.capabilities,
          resourceKinds: row.resourceKinds,
          startsAt: new Date(row.startsAt).toISOString(),
          endsAt: new Date(row.endsAt).toISOString(),
          revokedAt: row.revokedAt ? new Date(row.revokedAt).toISOString() : null,
          grantedBy: row.grantedBy,
          reason: row.reason,
        })),
        delegationEnabled: true,
      });
      if (grantDecision.allowed) {
        decision = { allowed: true, capability, reason: "maintenance_grant", relationship: target.id };
      }
    } catch {
      // Keep the Root denial when grant lookup fails closed.
    }
  }

  if (!decision.allowed) return { ok: false as const, status: actor.accountActive ? 403 : 401, error: "Forbidden" };
  return { ok: true as const, session, actor, target, rlsContext: customizationRlsTarget(target, actor.userId, actor.mfaVerified) };
}
