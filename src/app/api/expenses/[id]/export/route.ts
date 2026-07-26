import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertExpenseView,
  requireExpenseSession,
} from "@/lib/auth/expenses-session";
import {
  buildExpenseExportPdf,
  buildExpenseExportXlsx,
  buildExpenseReceiptZip,
  expenseExportFilename,
} from "@/lib/expenses/export";
import { expenseStore } from "@/lib/expenses/store";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireExpenseSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const { id } = await context.params;
  const submission = await expenseStore.getById(id);
  if (!submission || !assertExpenseView(session, submission)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "xlsx";

  await auditLog.log({
    userId: session.user.id,
    action: "expenses.export",
    resourceType: "expense_submission",
    resourceId: submission.id,
    unionId: submission.unionId,
    localId: submission.localId,
  });

  try {
    if (format === "pdf") {
      const blob = await buildExpenseExportPdf(submission);
      const buf = Buffer.from(await blob.arrayBuffer());
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${expenseExportFilename(submission, "pdf")}"`,
        },
      });
    }

    if (format === "zip") {
      const [xlsxBuffer, pdfBlob] = await Promise.all([
        buildExpenseExportXlsx(submission),
        buildExpenseExportPdf(submission),
      ]);
      const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
      const blob = await buildExpenseReceiptZip({
        submission,
        xlsxBuffer,
        pdfBuffer,
      });
      const buf = Buffer.from(await blob.arrayBuffer());
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${expenseExportFilename(submission, "zip")}"`,
        },
      });
    }

    const buf = await buildExpenseExportXlsx(submission);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${expenseExportFilename(submission, "xlsx")}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
