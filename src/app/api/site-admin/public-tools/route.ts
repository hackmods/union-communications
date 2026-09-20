import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { auditLog } from "@/lib/audit/store";
import { publicToolSettingsStore } from "@/lib/public-tools/store";
import { GATEABLE_PUBLIC_TOOL_SLUGS } from "@/lib/public-tools/visibility";
import { parseJsonBody } from "@/lib/validation/parse";

const putSchema = z.object({
  scope: z.enum(["platform", "union", "local"]),
  unionId: z.string().min(1).optional(),
  localId: z.string().min(1).optional(),
  disabledToolSlugs: z.array(z.string().min(1)),
});

export async function GET(request: Request) {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

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

  return NextResponse.json({
    gateable: GATEABLE_PUBLIC_TOOL_SLUGS,
    platform,
    union,
    local,
  });
}

export async function PUT(request: Request) {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const raw = await request.json().catch(() => null);
  const parsed = parseJsonBody(putSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.issues }, { status: 400 });
  }

  const { scope, unionId, localId, disabledToolSlugs } = parsed.data;
  const allowed = new Set(GATEABLE_PUBLIC_TOOL_SLUGS);
  const cleaned = disabledToolSlugs.filter((s) => allowed.has(s));
  const actor = gate.session.user.id;

  let record;
  if (scope === "platform") {
    record = await publicToolSettingsStore.setPlatform(cleaned, actor);
  } else if (scope === "union") {
    if (!unionId) {
      return NextResponse.json({ error: "unionId required" }, { status: 400 });
    }
    record = await publicToolSettingsStore.setUnion(unionId, cleaned, actor);
  } else {
    if (!unionId || !localId) {
      return NextResponse.json(
        { error: "unionId and localId required" },
        { status: 400 },
      );
    }
    record = await publicToolSettingsStore.setLocal(
      unionId,
      localId,
      cleaned,
      actor,
    );
  }

  await auditLog.log({
    userId: actor,
    action: "site_admin.public_tools.update",
    resourceType: "site_admin",
    resourceId: scope,
    metadata: {
      scope,
      unionId: unionId ?? "",
      localId: localId ?? "",
      disabled: cleaned.join(","),
    },
  });

  return NextResponse.json({ ok: true, record });
}
