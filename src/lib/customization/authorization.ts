import type { AuthorizationActor, AuthorizationDecision, Capability } from "@/lib/authorization/model";
import { z } from "zod";
import { idSchema, scopeSchema } from "@/lib/customization/schemas";
import type { CustomizationScope } from "@/lib/customization/types";

export const customizationCapabilitySchema = z.enum([
  "customization.readDraft", "customization.edit", "customization.publish",
  "customization.policy.manage", "customization.localParameters.edit", "customization.grants.manage",
]);
export type CustomizationCapability = z.infer<typeof customizationCapabilitySchema>;
/** Reserved for C13; no grant confers authority in the launch decision function. */
export const maintenanceGrantSchema = z.object({
  id: idSchema, userId: idSchema, unionId: idSchema, scopeId: idSchema,
  capabilities: z.array(customizationCapabilitySchema).min(1).max(6),
  resourceKinds: z.array(z.enum(["guide", "brand", "source", "tool", "workflow"])).min(1).max(5),
  startsAt: z.string().datetime(), endsAt: z.string().datetime(), revokedAt: z.string().datetime().nullable(),
  grantedBy: idSchema, reason: z.string().trim().min(1).max(1000),
}).strict().refine((grant) => Date.parse(grant.endsAt) > Date.parse(grant.startsAt), "Grant expiry must follow its start");

export function decideCustomizationManagement(
  actor: AuthorizationActor | null,
  capability: CustomizationCapability,
  target: CustomizationScope,
  options: { allowDemoActor?: boolean } = {},
): AuthorizationDecision {
  customizationCapabilitySchema.parse(capability);
  const scope = scopeSchema.parse(target);
  const denied = (reason: string): AuthorizationDecision => ({ allowed: false, capability: capability as Capability, reason });
  if (!actor) return denied("authentication_required");
  if (!actor.accountActive) return denied("inactive_account");
  if (actor.source !== "database" && !options.allowDemoActor) return denied("durable_actor_required");
  if (!actor.mfaVerified) return denied("mfa_required");
  if (scope.archived) return denied("archived_scope");
  if (!actor.roles.includes("platform_admin")) return denied("root_only");
  // This explicit content-only exception never changes generic casework decisions.
  return { allowed: true, capability, reason: "platform_content_operator", relationship: scope.id };
}
