import { z } from "zod";
import { createCustomizationResource } from "@/lib/customization/admin";
import { noStoreJson, targetScopeSchema, withCustomizationMutation } from "@/lib/customization/http";

const createSchema = z.object({
  target: targetScopeSchema,
  key: z.string().min(1),
  kind: z.enum(["guide", "brand", "source", "tool", "workflow"]),
  slug: z.string().min(1).max(128).optional(),
}).strict();

/** POST /api/site-admin/customization/resources */
export async function POST(req: Request) {
  return withCustomizationMutation(req, "customization.edit", createSchema, async ({ data, gate, adapter }) => {
    const created = await createCustomizationResource(adapter, gate.rlsContext, {
      scopeId: data.target.id,
      unionId: data.target.kind === "system" ? null : data.target.unionId,
      key: data.key,
      kind: data.kind,
      slug: data.slug,
      actorId: gate.actor.userId,
    });
    return noStoreJson({ ok: true, ...created });
  });
}
