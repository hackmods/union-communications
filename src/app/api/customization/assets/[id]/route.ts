import { NextResponse } from "next/server";
import { authorizeAssetRead } from "@/lib/customization/assets";
import { requireCustomizationSession } from "@/lib/auth/customization-session";
import { getCustomizationAdapter } from "@/lib/customization/store";
import { getObjectStorage } from "@/lib/attachments/storage";
import { scopeSchema } from "@/lib/customization/schemas";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/customization/assets/[id]
 * Authorizes every request before returning bytes. No public cache.
 */
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(req.url);
  const targetRaw = url.searchParams.get("target");
  let target;
  try {
    target = scopeSchema.parse(targetRaw ? JSON.parse(targetRaw) : { id: "system", kind: "system", archived: false });
  } catch {
    return NextResponse.json({ error: "Invalid target" }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
  const gate = await requireCustomizationSession(target, "customization.readDraft");
  if (!gate.ok) {
    // Ordinary readers are not Root — deny private asset enumeration via this admin-gated path.
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  try {
    const adapter = getCustomizationAdapter();
    const authorized = await authorizeAssetRead(adapter, gate.rlsContext, id);
    if (!authorized.ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    }
    const bytes = await getObjectStorage().get(authorized.storageKey);
    if (!bytes) {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    }
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": authorized.mime,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
