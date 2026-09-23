import { NextResponse } from "next/server";
import { z } from "zod";
import { noStoreJson, targetScopeSchema, withCustomizationMutation } from "@/lib/customization/http";
import { uploadCustomizationAsset } from "@/lib/customization/assets";

const metaSchema = z.object({
  target: targetScopeSchema,
  mime: z.string().min(1).max(100),
  rightsNote: z.string().trim().min(1).max(1000),
  altText: z.object({ en: z.string().min(1).max(200), fr: z.string().min(1).max(200) }).strict(),
  /** Base64 payload — capped by validateCustomizationAssetBytes. */
  dataBase64: z.string().min(1).max(7_000_000),
}).strict();

/** POST /api/site-admin/customization/assets — Root upload with MIME/size validation. */
export async function POST(req: Request) {
  return withCustomizationMutation(req, "customization.edit", metaSchema, async ({ data, gate, adapter }) => {
    let bytes: Buffer;
    try {
      bytes = Buffer.from(data.dataBase64, "base64");
    } catch {
      return noStoreJson({ error: "Invalid asset payload" }, { status: 400 });
    }
    const result = await uploadCustomizationAsset(adapter, gate.rlsContext, {
      target: data.target,
      bytes,
      mime: data.mime,
      rightsNote: data.rightsNote,
      altText: data.altText,
      actorId: gate.actor.userId,
    });
    if (!result.ok) return noStoreJson({ error: result.error }, { status: result.status });
    return noStoreJson({ assetId: result.assetId, hash: result.hash });
  });
}
