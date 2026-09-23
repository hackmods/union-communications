import { z } from "zod";
import { getDraft, saveDraft, draftContentHash } from "@/lib/customization/drafts";
import { layerSchema } from "@/lib/customization/schemas";
import { noStoreJson, resourceIdSchema, targetScopeSchema, withCustomizationMutation } from "@/lib/customization/http";

const patchSchema = z.object({
  target: targetScopeSchema,
  resourceId: resourceIdSchema,
  expectedLockVersion: z.number().int().min(0),
  payload: layerSchema,
  baseReleaseId: z.string().nullable().optional(),
  ancestorHeads: z.record(z.string(), z.string()).optional(),
  reviews: z.record(z.string(), z.object({
    hash: z.string().min(1),
    reviewedBy: z.string().min(1),
    reviewedAt: z.string().datetime(),
  })).optional(),
  markReviewed: z.boolean().optional(),
  reason: z.string().trim().min(1).max(1000),
}).strict();

type Params = { params: Promise<{ id: string }> };

/** GET /api/site-admin/customization/resources/[id]/draft */
export async function GET() {
  // Draft reads require an explicit target scope from the editor (C07); refuse unscoped GET.
  return noStoreJson(
    { error: "Use authenticated editor load with explicit target scope" },
    { status: 405 },
  );
}

/** PATCH /api/site-admin/customization/resources/[id]/draft */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  return withCustomizationMutation(req, "customization.edit", patchSchema, async ({ data, gate, adapter }) => {
    if (data.resourceId !== id) return noStoreJson({ error: "Resource mismatch" }, { status: 400 });
    const hash = draftContentHash(data.payload);
    const reviewedAt = new Date().toISOString();
    const reviews = data.markReviewed
      ? {
        en: { hash, reviewedBy: gate.actor.userId, reviewedAt },
        fr: { hash, reviewedBy: gate.actor.userId, reviewedAt },
      }
      : data.reviews;
    const result = await saveDraft(adapter, gate.rlsContext, {
      resourceId: data.resourceId,
      scopeId: data.target.id,
      unionId: data.target.kind === "system" ? null : data.target.unionId,
      actorId: gate.actor.userId,
      expectedLockVersion: data.expectedLockVersion,
      payload: data.payload,
      baseReleaseId: data.baseReleaseId,
      ancestorHeads: data.ancestorHeads,
      reviews,
      reason: data.reason,
    });
    if (!result.ok) return noStoreJson({ error: result.error }, { status: result.status });
    const draft = await getDraft(adapter, gate.rlsContext, data.resourceId);
    return noStoreJson({ ok: true, lockVersion: result.lockVersion, draft });
  });
}
