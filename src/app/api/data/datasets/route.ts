import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { requireDataAccess } from "@/lib/data-workbench/access";
import { createDataset, listDatasets } from "@/lib/data-workbench/service";
import { parseJsonBody } from "@/lib/validation/parse";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).default(""),
  kind: z.enum(["table", "member_employment"]),
  fields: z.array(z.object({
    id: z.string().regex(/^[a-z][a-zA-Z0-9_]{0,63}$/),
    label: z.string().trim().min(1).max(100),
    type: z.enum(["text", "number", "date", "boolean"]),
    access: z.enum(["restricted", "officer"]),
  })).max(100).default([]),
});

export async function GET() {
  const access = await requireDataAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const datasets = await withRlsContext((await rlsContextForSession(access.session)) ?? {}, () => listDatasets(access));
  return NextResponse.json({ datasets });
}

export async function POST(request: Request) {
  const access = await requireDataAccess(true);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const parsed = parseJsonBody(schema, await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: "Validation failed", issues: parsed.issues }, { status: 400 });
  const dataset = await withRlsContext((await rlsContextForSession(access.session)) ?? {}, () => createDataset(access, parsed.data));
  await auditLog.log({ userId: access.session.user.id, action: "data.dataset.create", resourceType: "data_dataset", resourceId: dataset.id, unionId: access.unionId, localId: access.localId });
  return NextResponse.json({ dataset }, { status: 201 });
}
