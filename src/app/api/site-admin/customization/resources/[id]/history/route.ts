import { z } from "zod";
import { noStoreJson, resourceIdSchema, targetScopeSchema, withCustomizationMutation } from "@/lib/customization/http";

const historySchema = z.object({
  target: targetScopeSchema,
  resourceId: resourceIdSchema,
  limit: z.number().int().min(1).max(50).optional(),
}).strict();

type Params = { params: Promise<{ id: string }> };

/** POST /api/site-admin/customization/resources/[id]/history — authorized release metadata only. */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  return withCustomizationMutation(req, "customization.readDraft", historySchema, async ({ data, gate, adapter }) => {
    if (data.resourceId !== id) return noStoreJson({ error: "Resource mismatch" }, { status: 400 });
    const limit = data.limit ?? 20;
    const history = await adapter.transaction(gate.rlsContext, async (tx) => {
      const releases = await tx.read("releases", { resourceId: data.resourceId });
      const audits = await tx.read("audit", { resourceId: data.resourceId });
      return {
        releases: [...releases]
          .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
          .slice(0, limit)
          .map((row) => ({
            id: row.id,
            revisionId: row.revisionId,
            publishedBy: row.publishedBy,
            createdAt: row.createdAt,
            replacesReleaseId: row.replacesReleaseId,
          })),
        audits: [...audits]
          .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
          .slice(0, limit)
          .map((row) => ({
            id: row.id,
            action: row.action,
            reason: row.reason,
            actorId: row.actorId,
            createdAt: row.createdAt,
          })),
      };
    });
    return noStoreJson(history);
  });
}
