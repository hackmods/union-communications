import { NextResponse } from "next/server";
import { z } from "zod";
import { loadCustomizationContent } from "@/lib/customization/deliver-server";
import { resolvePresentationScopes } from "@/lib/customization/presentation-context";
import { resourceKeySchema } from "@/lib/customization/schemas";

type Params = { params: Promise<{ key: string }> };

const querySchema = z.object({
  locale: z.enum(["en", "fr"]).default("en"),
  /** Trusted Brand Kit preset / tenant slug — never a forged free-form union id. */
  presetId: z.string().min(1).max(80).optional(),
  scopeId: z.string().min(1).max(120).optional(),
});

/** GET /api/customization/content/[key] — authorized published DTO only, no-store. */
export async function GET(req: Request, { params }: Params) {
  const { key: rawKey } = await params;
  let key: string;
  try {
    key = resourceKeySchema.parse(decodeURIComponent(rawKey));
  } catch {
    return NextResponse.json({ error: "Invalid resource key" }, { status: 400 });
  }
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    locale: url.searchParams.get("locale") ?? "en",
    presetId: url.searchParams.get("presetId") ?? undefined,
    scopeId: url.searchParams.get("scopeId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const presentation = resolvePresentationScopes({ presetId: parsed.data.presetId });
  // Explicit scopeId is only accepted when it matches the trusted presentation chain.
  const targetScopeId =
    parsed.data.scopeId && presentation.scopes.some((scope) => scope.id === parsed.data.scopeId)
      ? parsed.data.scopeId
      : presentation.targetScopeId;

  const result = await loadCustomizationContent({
    key,
    locale: parsed.data.locale,
    targetScopeId,
    scopes: presentation.scopes,
    context: presentation.unionId ? { unionId: presentation.unionId } : {},
  });

  const headers = { "Cache-Control": "private, no-store" };
  if (result.status === "missing") {
    return NextResponse.json({ status: "missing" }, { status: 404, headers });
  }
  if (result.status === "unavailable") {
    const status = result.reason === "service_error" ? 503 : 404;
    return NextResponse.json({ status: "unavailable", reason: result.reason }, { status, headers });
  }
  return NextResponse.json({
    status: "resolved",
    content: result.content,
    releaseId: result.releaseId,
    scopeId: targetScopeId,
  }, { headers });
}
