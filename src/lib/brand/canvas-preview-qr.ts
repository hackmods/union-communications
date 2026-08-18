import { SITE_URL } from "@/lib/seo/site";
import { resolveLocalWebsiteUrl } from "@/lib/utils/local-links";
import type { BrandKit } from "@/types/entities";

/**
 * Payload for the Brand Kit canvas chrome preview QR.
 * Local website when saved; otherwise the public UnionOps origin so the
 * plate is a real code, not an empty placeholder.
 */
export function canvasPreviewQrTarget(kit: BrandKit): string {
  return resolveLocalWebsiteUrl(kit, SITE_URL);
}
