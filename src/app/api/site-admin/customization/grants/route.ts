import { z } from "zod";
import { noStoreJson, targetScopeSchema, withCustomizationMutation } from "@/lib/customization/http";
import { customizationCapabilitySchema } from "@/lib/customization/authorization";
import {
  createMaintenanceGrant,
  isCustomizationDelegationEnabled,
  revokeMaintenanceGrant,
} from "@/lib/customization/grants";

const listSchema = z.object({
  target: targetScopeSchema,
  action: z.literal("list"),
}).strict();

const createSchema = z.object({
  target: targetScopeSchema,
  action: z.literal("create"),
  userId: z.string().min(1),
  capabilities: z.array(customizationCapabilitySchema).min(1).max(6),
  resourceKinds: z.array(z.enum(["guide", "brand", "source", "tool", "workflow"])).min(1).max(5),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().trim().min(1).max(1000),
}).strict();

const revokeSchema = z.object({
  target: targetScopeSchema,
  action: z.literal("revoke"),
  grantId: z.string().min(1),
  reason: z.string().trim().min(1).max(1000),
}).strict();

const bodySchema = z.discriminatedUnion("action", [listSchema, createSchema, revokeSchema]);

/** GET/POST /api/site-admin/customization/grants — Root grant management (flag-gated create). */
export async function POST(req: Request) {
  return withCustomizationMutation(req, "customization.grants.manage", bodySchema, async ({ data, gate, adapter }) => {
    if (data.action === "list") {
      const grants = await adapter.transaction(gate.rlsContext, async (tx) =>
        tx.read("grants", { unionId: data.target.kind === "system" ? undefined : data.target.unionId }),
      );
      return noStoreJson({ grants, delegationEnabled: isCustomizationDelegationEnabled() });
    }
    if (!isCustomizationDelegationEnabled()) {
      return noStoreJson({ error: "Delegation is disabled on this host" }, { status: 403 });
    }
    if (data.action === "create") {
      const grant = await createMaintenanceGrant(adapter, gate.rlsContext, {
        target: data.target,
        actorId: gate.actor.userId,
        body: {
          userId: data.userId,
          capabilities: data.capabilities,
          resourceKinds: data.resourceKinds,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          reason: data.reason,
        },
      });
      return noStoreJson({ grant });
    }
    await revokeMaintenanceGrant(adapter, gate.rlsContext, {
      grantId: data.grantId,
      actorId: gate.actor.userId,
      reason: data.reason,
    });
    return noStoreJson({ revoked: true, grantId: data.grantId });
  });
}
