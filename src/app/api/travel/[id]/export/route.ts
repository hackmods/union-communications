import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertTravelView,
  requireTravelSession,
} from "@/lib/auth/travel-session";
import {
  buildReceiptZip,
  buildTravelExportPdf,
  buildTravelExportXlsx,
  travelExportFilename,
} from "@/lib/travel/export";
import { travelStore } from "@/lib/travel/store";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireTravelSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const { id } = await context.params;
  const authorization = await travelStore.getAuthorization(id);
  if (!authorization || !assertTravelView(session, authorization)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [advance, claim] = await Promise.all([
    travelStore.getAdvanceForAuth(id),
    travelStore.getClaimForAuth(id),
  ]);

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "xlsx";

  await auditLog.log({
    userId: session.user.id,
    action: "travel.export",
    resourceType: "travel_authorization",
    resourceId: authorization.id,
    unionId: authorization.unionId,
    localId: authorization.localId,
  });

  try {
    if (format === "pdf") {
      const blob = await buildTravelExportPdf({
        auth: authorization,
        advance,
        claim,
      });
      const buf = Buffer.from(await blob.arrayBuffer());
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${travelExportFilename(authorization, "pdf")}"`,
        },
      });
    }

    if (format === "zip") {
      const [xlsxBuffer, pdfBlob] = await Promise.all([
        buildTravelExportXlsx({
          auth: authorization,
          advance,
          claim,
        }),
        buildTravelExportPdf({
          auth: authorization,
          advance,
          claim,
        }),
      ]);
      const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
      const blob = await buildReceiptZip({
        auth: authorization,
        claim,
        xlsxBuffer,
        pdfBuffer,
      });
      const buf = Buffer.from(await blob.arrayBuffer());
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${travelExportFilename(authorization, "zip")}"`,
        },
      });
    }

    const buf = await buildTravelExportXlsx({
      auth: authorization,
      advance,
      claim,
    });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${travelExportFilename(authorization, "xlsx")}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
