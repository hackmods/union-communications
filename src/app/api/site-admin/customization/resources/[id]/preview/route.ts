import { z } from "zod";
import { draftContentHash, getDraft } from "@/lib/customization/drafts";
import { previewDraftContent } from "@/lib/customization/preview";
import { noStoreJson, resourceIdSchema, targetScopeSchema, withCustomizationMutation } from "@/lib/customization/http";
import { scopeSchema } from "@/lib/customization/schemas";

const previewSchema = z.object({
  target: targetScopeSchema,
  resourceId: resourceIdSchema,
  locale: z.enum(["en", "fr"]),
  scopes: z.array(scopeSchema).min(1).max(64),
  reason: z.string().trim().min(1).max(1000),
}).strict();

type Params = { params: Promise<{ id: string }> };

/** POST /api/site-admin/customization/resources/[id]/preview — authenticated private preview only. */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  return withCustomizationMutation(req, "customization.readDraft", previewSchema, async ({ data, gate, adapter }) => {
    if (data.resourceId !== id) return noStoreJson({ error: "Resource mismatch" }, { status: 400 });
    const draft = await getDraft(adapter, gate.rlsContext, data.resourceId);
    if (!draft) return noStoreJson({ error: "draft_not_found" }, { status: 404 });
    const hash = draftContentHash(draft.payload);
    const preview = previewDraftContent({
      key: draft.payload.key,
      locale: data.locale,
      scopes: data.scopes,
      targetScopeId: data.target.id,
      layers: [draft.payload],
      reviews: draft.reviews,
      contentHash: hash,
    });
    return noStoreJson(preview);
  });
}
