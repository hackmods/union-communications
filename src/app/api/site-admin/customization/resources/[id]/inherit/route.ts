import { z } from "zod";
import { noStoreJson, resourceIdSchema, targetScopeSchema, withCustomizationMutation } from "@/lib/customization/http";
import { inheritAgain } from "@/lib/customization/publish";
import { scopeSchema } from "@/lib/customization/schemas";

const inheritSchema = z.object({
  target: targetScopeSchema,
  resourceId: resourceIdSchema,
  key: z.string().min(1),
  reason: z.string().trim().min(1).max(1000),
  expectedLockVersion: z.number().int().min(1),
  scopes: z.array(scopeSchema).min(1).max(64),
}).strict();

type Params = { params: Promise<{ id: string }> };

/** POST /api/site-admin/customization/resources/[id]/inherit */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  return withCustomizationMutation(req, "customization.edit", inheritSchema, async ({ data, gate, adapter }) => {
    if (data.resourceId !== id) return noStoreJson({ error: "Resource mismatch" }, { status: 400 });
    const result = await inheritAgain(adapter, gate.rlsContext, {
      resourceId: data.resourceId,
      actorId: gate.actor.userId,
      reason: data.reason,
      expectedLockVersion: data.expectedLockVersion,
      key: data.key,
      scopes: data.scopes,
    });
    if (!result.ok) return noStoreJson({ error: result.error, conflicts: result.conflicts }, { status: result.status });
    return noStoreJson(result);
  });
}
