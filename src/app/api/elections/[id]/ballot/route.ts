import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertElectionView,
  requireElectionsSession,
} from "@/lib/auth/elections-session";
import { buildElectionBallotDocxBlob } from "@/lib/elections/export-ballot";
import { electionsStore } from "@/lib/elections/store";
import { resolveLocalNumber } from "@/lib/utils/local";

type RouteContext = { params: Promise<{ id: string }> };

/** Printable ballot export — not an online secret ballot. */
export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireElectionsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const cycle = await electionsStore.getById(id);
  if (!cycle) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!assertElectionView(authResult.session, cycle)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const localLabel = `Local ${resolveLocalNumber()}`;
  try {
    const blob = await buildElectionBallotDocxBlob(cycle, localLabel);
    const buffer = Buffer.from(await blob.arrayBuffer());
    const safeTitle = cycle.title.replace(/[^\w\-]+/g, "_").slice(0, 60);

    await auditLog.log({
      userId: authResult.session.user.id,
      action: "elections.ballot.export",
      resourceType: "election_cycle",
      resourceId: id,
      unionId: cycle.unionId,
      localId: cycle.localId,
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="ballot-${safeTitle}.docx"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Ballot export failed" },
      { status: 500 },
    );
  }
}
