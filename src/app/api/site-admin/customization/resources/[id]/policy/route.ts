import { z } from "zod";
import { setPolicyAtomically } from "@/lib/customization/publish";
import { audienceSchema } from "@/lib/customization/schemas";
import { noStoreJson, resourceIdSchema, targetScopeSchema, withCustomizationMutation } from "@/lib/customization/http";

const policySchema = z.object({
  target: targetScopeSchema,
  resourceId: resourceIdSchema,
  reason: z.string().trim().min(1).max(1000),
  expectedPolicyVersion: z.number().int().min(1),
  audience: audienceSchema.optional(),
  enabled: z.boolean().optional(),
  withdrawn: z.boolean().optional(),
  publicListing: z.boolean().optional(),
}).strict();

type Params = { params: Promise<{ id: string }> };

/** POST /api/site-admin/customization/resources/[id]/policy */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  return withCustomizationMutation(req, "customization.policy.manage", policySchema, async ({ data, gate, adapter }) => {
    if (data.resourceId !== id) return noStoreJson({ error: "Resource mismatch" }, { status: 400 });
    const result = await setPolicyAtomically(adapter, gate.rlsContext, {
      resourceId: data.resourceId,
      scopeId: data.target.id,
      unionId: data.target.kind === "system" ? null : data.target.unionId,
      actorId: gate.actor.userId,
      reason: data.reason,
      expectedPolicyVersion: data.expectedPolicyVersion,
      audience: data.audience,
      enabled: data.enabled,
      withdrawn: data.withdrawn,
      publicListing: data.publicListing,
    });
    if (!result.ok) return noStoreJson({ error: result.error }, { status: result.status });
    return noStoreJson(result);
  });
}
