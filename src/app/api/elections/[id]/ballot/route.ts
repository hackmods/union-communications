import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertElectionView,
  requireElectionsSession,
} from "@/lib/auth/elections-session";
import { canvasFontOfficeName } from "@/lib/comms/canvas-fonts";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { buildElectionBallotDocxBlob } from "@/lib/elections/export-ballot";
import { electionsStore } from "@/lib/elections/store";
import { resolveBrandLogoBytes } from "@/lib/export/brand-logo-bytes";
import { guidePdfBrandFromKit } from "@/lib/export/text-pdf-layout";
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
  const brand = guidePdfBrandFromKit(DEFAULT_BRAND_KIT);
  const logo = await resolveBrandLogoBytes(DEFAULT_BRAND_KIT, {
    includeLogo: true,
    backgroundColor: DEFAULT_BRAND_KIT.primaryColor,
  });
  try {
    const blob = await buildElectionBallotDocxBlob(cycle, localLabel, {
      headlineFont: canvasFontOfficeName(brand.headlineFontId),
      bodyFont: canvasFontOfficeName(brand.bodyFontId),
      primaryColor: DEFAULT_BRAND_KIT.primaryColor,
      logo,
      locale: "en",
    });
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
