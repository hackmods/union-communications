import { NextResponse } from "next/server";
import { publicToolSettingsStore } from "@/lib/public-tools/store";
import { resolvePublicToolEnabled } from "@/lib/public-tools/visibility";
import { GATEABLE_PUBLIC_TOOL_SLUGS } from "@/lib/public-tools/visibility";

/**
 * Public (no auth) — returns which gateable tools are disabled for the
 * optional union/local context. Used by Header / tools catalog clients.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const unionId = url.searchParams.get("unionId") || undefined;
  const localId = url.searchParams.get("localId") || undefined;

  const platform = await publicToolSettingsStore.getPlatform();
  const union = unionId
    ? await publicToolSettingsStore.getUnion(unionId)
    : null;
  const local =
    unionId && localId
      ? await publicToolSettingsStore.getLocal(unionId, localId)
      : null;

  const disabled = GATEABLE_PUBLIC_TOOL_SLUGS.filter(
    (slug) =>
      !resolvePublicToolEnabled(slug, {
        platformDisabled: platform.disabledToolSlugs,
        unionDisabled: union?.disabledToolSlugs,
        localDisabled: local?.disabledToolSlugs,
      }),
  );

  return NextResponse.json({ disabled });
}
