import { NextResponse } from "next/server";
import { z } from "zod";
import { loadCustomizationContent } from "@/lib/customization/deliver-server";
import { resourceKeySchema } from "@/lib/customization/schemas";

type Params = { params: Promise<{ key: string }> };

const querySchema = z.object({
  locale: z.enum(["en", "fr"]).default("en"),
  scopeId: z.string().min(1).optional(),
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
    scopeId: url.searchParams.get("scopeId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const result = await loadCustomizationContent({
    key,
    locale: parsed.data.locale,
    targetScopeId: parsed.data.scopeId,
  });

  const headers = { "Cache-Control": "private, no-store" };
  if (result.status === "missing") {
    return NextResponse.json({ status: "missing" }, { status: 404, headers });
  }
  if (result.status === "unavailable") {
    const status = result.reason === "service_error" ? 503 : result.reason === "denied" ? 404 : 404;
    return NextResponse.json({ status: "unavailable", reason: result.reason }, { status, headers });
  }
  return NextResponse.json({ status: "resolved", content: result.content, releaseId: result.releaseId }, { headers });
}
