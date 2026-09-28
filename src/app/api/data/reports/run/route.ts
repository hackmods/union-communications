import { NextResponse } from "next/server";
import { z } from "zod";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { requireDataAccess } from "@/lib/data-workbench/access";
import {
  CURATED_REPORT_VIEWS,
  runCuratedReport,
  runDatasetRevisionReport,
  toCsv,
  type CuratedReportView,
} from "@/lib/data-workbench/reports";

const bodySchema = z.object({
  view: z.enum(["people_as_of", "assignments_as_of", "dues_standing_snapshot", "dataset_revision"]),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  datasetId: z.string().min(1).max(100).optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

export async function POST(request: Request) {
  const access = await requireDataAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid report request." }, { status: 400 });

  try {
    const rlsContext = await rlsContextForSession(access.session) ?? {};
    const result = await withRlsContext(rlsContext, async () => {
      if (parsed.data.view === "dataset_revision") {
        if (!parsed.data.datasetId) throw new Error("datasetId is required for dataset revision reports.");
        return runDatasetRevisionReport(access, parsed.data.datasetId);
      }
      if (!CURATED_REPORT_VIEWS.includes(parsed.data.view as CuratedReportView)) {
        throw new Error("Unknown report view.");
      }
      return runCuratedReport(access, {
        view: parsed.data.view as CuratedReportView,
        asOf: parsed.data.asOf,
      });
    });

    if (parsed.data.format === "csv") {
      const csv = toCsv(result.columns, result.rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="unionops-data-${result.view}.csv"`,
        },
      });
    }
    return NextResponse.json({ report: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Report failed." }, { status: 400 });
  }
}
