import { z } from "zod";
import { rollbackToRevision } from "@/lib/customization/publish";
import { noStoreJson, resourceIdSchema, targetScopeSchema, withCustomizationMutation } from "@/lib/customization/http";
import { scopeSchema } from "@/lib/customization/schemas";

const rollbackSchema = z.object({
  target: targetScopeSchema,
  resourceId: resourceIdSchema,
  historicalRevisionId: z.string().min(1),
  reason: z.string().trim().min(1).max(1000),
  idempotencyKey: z.string().trim().min(8).max(128),
  expectedDraftLockVersion: z.number().int().min(1),
  expectedGeneration: z.number().int().min(0),
  scopes: z.array(scopeSchema).min(1).max(64),
}).strict();

type Params = { params: Promise<{ id: string }> };

/** POST /api/site-admin/customization/resources/[id]/rollback */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  return withCustomizationMutation(req, "customization.publish", rollbackSchema, async ({ data, gate, adapter }) => {
    if (data.resourceId !== id) return noStoreJson({ error: "Resource mismatch" }, { status: 400 });
    const result = await rollbackToRevision(adapter, gate.rlsContext, {
      resourceId: data.resourceId,
      actorId: gate.actor.userId,
      reason: data.reason,
      idempotencyKey: data.idempotencyKey,
      expectedDraftLockVersion: data.expectedDraftLockVersion,
      expectedGeneration: data.expectedGeneration,
      scopes: data.scopes,
      historicalRevisionId: data.historicalRevisionId,
      requireBilingualReview: false,
    });
    if (!result.ok) return noStoreJson({ error: result.error, conflicts: result.conflicts }, { status: result.status });
    return noStoreJson(result);
  });
}
