import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import {
  deletePresetBinding,
  listPresetBindings,
  upsertPresetBinding,
} from "@/lib/brand/preset-bindings-store";
import { isTrustedCommsPresetId } from "@/lib/brand/comms-preset-catalog";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const putSchema = z
  .object({
    presetId: z.string().min(1).max(64),
    sectorId: z.string().max(64).optional(),
    unionId: z.string().min(1).max(128),
    scopeId: z.string().min(1).max(128),
    published: z.boolean().optional(),
  })
  .strict();

const deleteSchema = z
  .object({
    presetId: z.string().min(1).max(64),
    sectorId: z.string().max(64).optional(),
  })
  .strict();

/**
 * Site Admin CRUD for Comms preset × sector → Hub scope bindings.
 */
export async function GET(request: Request) {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const unionId = new URL(request.url).searchParams.get("unionId") ?? undefined;
  return NextResponse.json({
    bindings: listPresetBindings(unionId ? { unionId } : undefined),
  });
}

export async function PUT(request: Request) {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(putSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }
  if (!isTrustedCommsPresetId(parsed.data.presetId)) {
    return NextResponse.json({ error: "Unknown preset" }, { status: 400 });
  }

  try {
    const binding = upsertPresetBinding({
      ...parsed.data,
      updatedBy: gate.session.user.id,
    });
    return NextResponse.json({ binding });
  } catch (err) {
    if (err instanceof Error && err.message === "union_mismatch") {
      return NextResponse.json({ error: "Union mismatch" }, { status: 409 });
    }
    reportApiFailure(err, "/api/site-admin/preset-bindings");
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(deleteSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }
  const removed = deletePresetBinding(
    parsed.data.presetId,
    parsed.data.sectorId ?? "",
  );
  return NextResponse.json({ removed });
}
