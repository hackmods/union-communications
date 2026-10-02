import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import {
  archiveDurableCommsPreset,
  listDurableCommsPresets,
  listMergedCommsPresets,
  upsertDurableCommsPreset,
} from "@/lib/brand/comms-preset-catalog";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const HEX = /^#[0-9A-Fa-f]{6}$/;

const putSchema = z
  .object({
    id: z.string().min(2).max(64),
    name: z.string().min(1).max(120),
    nameFr: z.string().max(120).optional(),
    primaryColor: z.string().regex(HEX),
    secondaryColor: z.string().regex(HEX),
    accentColor: z.string().regex(HEX).optional(),
    logoText: z.string().max(12).optional(),
    defaultSlogans: z.array(z.string().max(200)).max(12).default([]),
    archived: z.boolean().optional(),
  })
  .strict();

const archiveSchema = z
  .object({
    id: z.string().min(2).max(64),
  })
  .strict();

/** Site Admin durable Comms preset catalog (overlays compiled UNION_PRESETS). */
export async function GET() {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  return NextResponse.json({
    durable: listDurableCommsPresets(true),
    merged: listMergedCommsPresets(),
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

  try {
    const preset = upsertDurableCommsPreset({
      id: parsed.data.id,
      name: parsed.data.name,
      nameFr: parsed.data.nameFr,
      primaryColor: parsed.data.primaryColor,
      secondaryColor: parsed.data.secondaryColor,
      accentColor: parsed.data.accentColor,
      logoText: parsed.data.logoText,
      defaultSlogans: parsed.data.defaultSlogans,
      archivedAt: parsed.data.archived ? new Date().toISOString() : null,
      updatedBy: gate.session.user.id,
    });
    return NextResponse.json({ preset });
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message === "invalid_preset_id" || err.message === "invalid_preset_name")
    ) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    reportApiFailure(err, "/api/site-admin/comms-presets");
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
  const parsed = parseJsonBody(archiveSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }
  const preset = archiveDurableCommsPreset(
    parsed.data.id,
    gate.session.user.id,
  );
  if (!preset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ preset });
}
