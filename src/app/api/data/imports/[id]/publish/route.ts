import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { requireDataAccess } from "@/lib/data-workbench/access";
import { publishImport } from "@/lib/data-workbench/service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireDataAccess(true);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  try {
    const publication = await withRlsContext(rlsContextForSession(access.session) ?? {}, () => publishImport(access, id));
    if (!publication) return NextResponse.json({ error: "Import not found or already published." }, { status: 404 });
    await auditLog.log({ userId: access.session.user.id, action: "data.import.publish", resourceType: "data_publication", resourceId: publication.publicationId, unionId: access.unionId, localId: access.localId, metadata: { acceptedCount: String(publication.acceptedCount), heldCount: String(publication.heldCount) } });
    return NextResponse.json({ publication }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The import could not be published." }, { status: 400 });
  }
}
