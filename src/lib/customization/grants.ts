import { z } from "zod";
import type { CustomizationAdapter } from "@/lib/customization/adapter";
import {
  decideCustomizationManagement,
  maintenanceGrantSchema,
  type CustomizationCapability,
} from "@/lib/customization/authorization";
import type { AuthorizationActor } from "@/lib/authorization/model";
import type { CustomizationScope } from "@/lib/customization/types";
import type { RlsSessionContext } from "@/lib/db/rls-context";

export function isCustomizationDelegationEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return env.CUSTOMIZATION_DELEGATION_ENABLED === "true";
}

export type GrantDecision =
  | { allowed: true; reason: string; grantId: string }
  | { allowed: false; reason: string };

/**
 * Phase 3 grant branch. When the delegation flag is off, only Root decisions apply.
 * Grants never confer publish unless explicitly listed; no onward delegation.
 */
export function decideWithMaintenanceGrant(input: {
  actor: AuthorizationActor | null;
  capability: CustomizationCapability;
  target: CustomizationScope;
  grants: unknown[];
  at?: Date;
  delegationEnabled?: boolean;
}): GrantDecision | ReturnType<typeof decideCustomizationManagement> {
  const root = decideCustomizationManagement(input.actor, input.capability, input.target);
  if (root.allowed) return root;
  if (!(input.delegationEnabled ?? isCustomizationDelegationEnabled())) {
    return { allowed: false, reason: "delegation_disabled" };
  }
  if (!input.actor?.accountActive) return { allowed: false, reason: "inactive_account" };
  const now = input.at ?? new Date();
  for (const raw of input.grants) {
    const parsed = maintenanceGrantSchema.safeParse(raw);
    if (!parsed.success) continue;
    const grant = parsed.data;
    if (grant.revokedAt) continue;
    if (grant.userId !== input.actor.userId) continue;
    if (input.target.kind === "system") continue;
    if (grant.unionId !== input.target.unionId) continue;
    if (grant.scopeId !== input.target.id && input.target.kind !== "union") continue;
    if (Date.parse(grant.startsAt) > now.getTime()) continue;
    if (Date.parse(grant.endsAt) <= now.getTime()) continue;
    if (!grant.capabilities.includes(input.capability)) continue;
    return { allowed: true, reason: "maintenance_grant", grantId: grant.id };
  }
  return { allowed: false, reason: "no_active_grant" };
}

const createGrantBody = z.object({
  userId: z.string().min(1),
  capabilities: z.array(z.enum([
    "customization.readDraft",
    "customization.edit",
    "customization.publish",
    "customization.policy.manage",
    "customization.localParameters.edit",
    "customization.grants.manage",
  ])).min(1).max(6),
  resourceKinds: z.array(z.enum(["guide", "brand", "source", "tool", "workflow"])).min(1).max(5),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().trim().min(1).max(1000),
}).strict();

export async function createMaintenanceGrant(
  adapter: CustomizationAdapter,
  context: RlsSessionContext,
  input: {
    target: CustomizationScope;
    actorId: string;
    body: z.infer<typeof createGrantBody>;
  },
) {
  const body = createGrantBody.parse(input.body);
  if (Date.parse(body.endsAt) <= Date.parse(body.startsAt)) {
    throw new Error("Grant expiry must follow its start");
  }
  if (input.target.kind === "system" || !("unionId" in input.target)) {
    throw new Error("Grants require a tenant scope");
  }
  const id = `grant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const grant = maintenanceGrantSchema.parse({
    id,
    userId: body.userId,
    unionId: input.target.unionId,
    scopeId: input.target.id,
    capabilities: body.capabilities,
    resourceKinds: body.resourceKinds,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    revokedAt: null,
    grantedBy: input.actorId,
    reason: body.reason,
  });
  await adapter.transaction(context, async (tx) => {
    await tx.insert("grants", {
      id: grant.id,
      scopeId: grant.scopeId,
      unionId: grant.unionId,
      userId: grant.userId,
      capabilities: grant.capabilities,
      resourceKinds: grant.resourceKinds,
      startsAt: new Date(grant.startsAt),
      endsAt: new Date(grant.endsAt),
      revokedAt: null,
      revokedBy: null,
      grantedBy: grant.grantedBy,
      reason: grant.reason,
    });
  });
  return grant;
}

export async function revokeMaintenanceGrant(
  adapter: CustomizationAdapter,
  context: RlsSessionContext,
  input: { grantId: string; actorId: string; reason: string },
) {
  await adapter.transaction(context, async (tx) => {
    await tx.update("grants", { id: input.grantId }, {
      revokedAt: new Date(),
      revokedBy: input.actorId,
    });
  });
  return { ok: true as const, grantId: input.grantId, reason: input.reason };
}
