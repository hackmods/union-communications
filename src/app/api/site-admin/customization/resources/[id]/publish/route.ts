import { z } from "zod";
import { publishAtomically } from "@/lib/customization/publish";
import { noStoreJson, resourceIdSchema, targetScopeSchema, withCustomizationMutation } from "@/lib/customization/http";
import { scopeSchema } from "@/lib/customization/schemas";

const publishSchema = z.object({
  target: targetScopeSchema,
  resourceId: resourceIdSchema,
  reason: z.string().trim().min(1).max(1000),
  idempotencyKey: z.string().trim().min(8).max(128),
  expectedDraftLockVersion: z.number().int().min(1),
  expectedGeneration: z.number().int().min(0),
  expectedAncestorHeads: z.record(z.string(), z.string()).optional(),
  scopes: z.array(scopeSchema).min(1).max(64),
  affectedReleaseCount: z.number().int().min(1).max(500).optional(),
  descendantOverrides: z.array(z.object({
    scopeId: z.string().min(1),
    resourceId: z.string().min(1),
    blockIds: z.array(z.string().min(1)).max(100),
  }).strict()).max(500).optional(),
}).strict();

type Params = { params: Promise<{ id: string }> };

/** POST /api/site-admin/customization/resources/[id]/publish */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  return withCustomizationMutation(req, "customization.publish", publishSchema, async ({ data, gate, adapter }) => {
    if (data.resourceId !== id) return noStoreJson({ error: "Resource mismatch" }, { status: 400 });
    const result = await publishAtomically(adapter, gate.rlsContext, {
      resourceId: data.resourceId,
      actorId: gate.actor.userId,
      reason: data.reason,
      idempotencyKey: data.idempotencyKey,
      expectedDraftLockVersion: data.expectedDraftLockVersion,
      expectedGeneration: data.expectedGeneration,
      expectedAncestorHeads: data.expectedAncestorHeads,
      scopes: data.scopes,
      affectedReleaseCount: data.affectedReleaseCount,
      descendantOverrides: data.descendantOverrides,
    });
    if (!result.ok) return noStoreJson({ error: result.error, conflicts: result.conflicts }, { status: result.status });
    return noStoreJson(result);
  });
}
