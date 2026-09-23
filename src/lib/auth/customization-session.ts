import { auth } from "@/auth";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { isMfaEnabled, resolveMfaMode } from "@/lib/auth/mfa-policy";
import { decideCustomizationManagement, type CustomizationCapability } from "@/lib/customization/authorization";
import { customizationRlsTarget } from "@/lib/customization/context";
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
  const decision = decideCustomizationManagement(actor, capability, target, { allowDemoActor });
  if (!decision.allowed) return { ok: false as const, status: actor.accountActive ? 403 : 401, error: "Forbidden" };
  return { ok: true as const, session, actor, target, rlsContext: customizationRlsTarget(target, actor.userId, actor.mfaVerified) };
}
