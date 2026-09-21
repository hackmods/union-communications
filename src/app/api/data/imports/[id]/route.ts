import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { requireDataAccess } from "@/lib/data-workbench/access";
import { parsePage } from "@/lib/data-workbench/pagination";
import { getImport, saveImportMapping, setImportDecisions } from "@/lib/data-workbench/service";

const mappingSchema = z.object({ action: z.literal("mapping"), mapping: z.record(z.string(), z.string().max(100).nullable()) });
const decisionsSchema = z.object({ action: z.literal("decisions"), rowIndexes: z.array(z.number().int().positive()).min(1).max(50000), decision: z.enum(["accept", "exclude"]) });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireDataAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const url = new URL(request.url);
  const page = parsePage(url.searchParams);
  const result = await withRlsContext((await rlsContextForSession(access.session)) ?? {}, () => getImport(access, id, page));
  return result ? NextResponse.json(result) : NextResponse.json({ error: "Import not found." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireDataAccess(true);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = mappingSchema.safeParse(body);
  const decisions = decisionsSchema.safeParse(body);
  if (!parsed.success && !decisions.success) return NextResponse.json({ error: "Invalid import update." }, { status: 400 });
  try {
    const result = await withRlsContext((await rlsContextForSession(access.session)) ?? {}, () => {
      if (parsed.success) return saveImportMapping(access, id, parsed.data.mapping);
      if (decisions.success) return setImportDecisions(access, id, decisions.data);
      return Promise.resolve(null);
    });
    if (!result) return NextResponse.json({ error: "Import not found or already published." }, { status: 404 });
    await auditLog.log({ userId: access.session.user.id, action: parsed.success ? "data.import.map" : "data.import.decide", resourceType: "data_import_run", resourceId: id, unionId: access.unionId, localId: access.localId });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import could not be updated." }, { status: 400 });
  }
}
