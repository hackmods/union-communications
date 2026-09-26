import { NextResponse } from "next/server";
import { isNull } from "drizzle-orm";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import {
  bargainingUnits,
  divisions,
  locals,
  unions,
} from "@/lib/db/schema/tenant";

/**
 * GET /api/site-admin/tenant-options
 *
 * Unions, locals, and collections for assign / access-request UI.
 */
export async function GET() {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  if (!isPostgresConfigured()) {
    return NextResponse.json(
      { unions: [], collectives: [], locals: [], subGroups: [] },
      { status: 200 },
    );
  }

  const db = getDb();
  const [unionRows, collectiveRows, localRows, buRows] = await Promise.all([
    db
      .select({
        id: unions.id,
        name: unions.name,
        membershipPolicy: unions.membershipPolicy,
      })
      .from(unions)
      .where(isNull(unions.archivedAt)),
    db
      .select({ id: divisions.id, unionId: divisions.unionId, code: divisions.code, name: divisions.name })
      .from(divisions)
      .where(isNull(divisions.archivedAt)),
    db
      .select({
        id: locals.id,
        unionId: locals.unionId,
        divisionId: locals.divisionId,
        localNumber: locals.localNumber,
        subText: locals.subText,
      })
      .from(locals)
      .where(isNull(locals.archivedAt)),
    db
      .select({
        id: bargainingUnits.id,
        code: bargainingUnits.code,
        name: bargainingUnits.name,
        localId: bargainingUnits.localId,
      })
      .from(bargainingUnits),
  ]);

  return NextResponse.json({
    unions: unionRows,
    collectives: collectiveRows,
    locals: localRows,
    subGroups: buRows,
  });
}
