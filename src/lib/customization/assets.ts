import { createHash } from "node:crypto";
import type { CustomizationAdapter } from "@/lib/customization/adapter";
import { idSchema } from "@/lib/customization/schemas";
import type { CustomizationScope } from "@/lib/customization/types";
import type { RlsSessionContext } from "@/lib/db/rls-context";
import { getObjectStorage, sanitizeStorageSegment } from "@/lib/attachments/storage";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5_242_880;

export type AssetUploadInput = {
  target: CustomizationScope;
  bytes: Buffer;
  mime: string;
  rightsNote: string;
  altText: { en: string; fr: string };
  actorId: string;
};

export type AssetUploadResult =
  | { ok: true; assetId: string; storageKey: string; hash: string }
  | { ok: false; status: 400 | 413; error: string };

/** Reject SVG/HTML and oversize payloads before any storage write. */
export function validateCustomizationAssetBytes(mime: string, bytes: Buffer): AssetUploadResult | null {
  const normalized = mime.trim().toLowerCase();
  if (!ALLOWED_MIME.has(normalized)) {
    return { ok: false, status: 400, error: "Unsupported asset type" };
  }
  if (bytes.length <= 0 || bytes.length > MAX_BYTES) {
    return { ok: false, status: 413, error: "Asset exceeds size limit" };
  }
  // Hard reject scriptable markup even if MIME is spoofed.
  const head = bytes.subarray(0, 256).toString("utf8").toLowerCase();
  if (head.includes("<svg") || head.includes("<html") || head.includes("<script")) {
    return { ok: false, status: 400, error: "Unsupported asset content" };
  }
  return null;
}

export async function uploadCustomizationAsset(
  adapter: CustomizationAdapter,
  context: RlsSessionContext,
  input: AssetUploadInput,
): Promise<AssetUploadResult> {
  const invalid = validateCustomizationAssetBytes(input.mime, input.bytes);
  if (invalid) return invalid;

  const assetId = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const hash = createHash("sha256").update(input.bytes).digest("hex");
  const unionSegment = input.target.kind === "system" ? "system" : input.target.unionId;
  const storageKey = [
    "customization",
    sanitizeStorageSegment(unionSegment),
    sanitizeStorageSegment(assetId),
  ].join("/");

  const storage = getObjectStorage();
  await storage.put(storageKey, input.bytes, input.mime.trim().toLowerCase());

  await adapter.transaction(context, async (tx) => {
    await tx.insert("assets", {
      id: assetId,
      scopeId: input.target.id,
      unionId: input.target.kind === "system" ? null : input.target.unionId,
      storageKey,
      mime: input.mime.trim().toLowerCase(),
      bytes: input.bytes.length,
      hash,
      scanStatus: "clean",
      rightsNote: input.rightsNote,
      altText: input.altText,
      createdBy: input.actorId,
    });
  });

  return { ok: true, assetId, storageKey, hash };
}

export async function authorizeAssetRead(
  adapter: CustomizationAdapter,
  context: RlsSessionContext,
  assetId: string,
): Promise<{ ok: true; storageKey: string; mime: string } | { ok: false; status: 404 }> {
  const id = idSchema.parse(assetId);
  const rows = await adapter.transaction(context, async (tx) => tx.read("assets", { id }));
  const asset = rows[0];
  if (!asset || asset.scanStatus === "rejected") return { ok: false, status: 404 };
  return { ok: true, storageKey: asset.storageKey, mime: asset.mime };
}
