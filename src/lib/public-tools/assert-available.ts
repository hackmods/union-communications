import { notFound } from "next/navigation";
import { isPublicToolEnabled } from "@/lib/public-tools/store";

/** Server layout helper — 404 when the tool is platform/union/local disabled. */
export async function assertPublicToolAvailable(
  slug: string,
  ctx?: { unionId?: string; localId?: string },
): Promise<void> {
  const ok = await isPublicToolEnabled(slug, ctx);
  if (!ok) notFound();
}
