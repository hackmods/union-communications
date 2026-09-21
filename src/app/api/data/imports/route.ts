import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { getObjectStorage, resolveAttachmentStorageMode, resolveS3StorageConfig } from "@/lib/attachments/storage";
import { withRlsContext } from "@/lib/db/rls-context";
import { isScannerConfigured, postBytesToScanner } from "@/lib/attachments/scan";
import { requireDataAccess } from "@/lib/data-workbench/access";
import { createImportRun, getDataset, listImports } from "@/lib/data-workbench/service";
import { MAX_IMPORT_BYTES, parseUploadedTable } from "@/lib/data-workbench/table-parser";

export const runtime = "nodejs";
export const maxDuration = 300;

const mimeFor = (name: string) => /\.csv$/i.test(name) ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET() {
  const access = await requireDataAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const imports = await withRlsContext((await rlsContextForSession(access.session)) ?? {}, () => listImports(access));
  return NextResponse.json({ imports });
}

export async function POST(request: Request) {
  const access = await requireDataAccess(true);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (process.env.NODE_ENV === "production") {
    try {
      const storageMode = resolveAttachmentStorageMode();
      if (storageMode === "local" && !process.env.ATTACHMENT_LOCAL_DIR?.trim()) {
        return NextResponse.json({ error: "Configure ATTACHMENT_LOCAL_DIR for durable private Data uploads, or configure S3-compatible attachment storage." }, { status: 503 });
      }
      if (storageMode === "s3") resolveS3StorageConfig();
    } catch {
      return NextResponse.json({ error: "Configure private attachment storage before importing union data." }, { status: 503 });
    }
  }
  const form = await request.formData().catch(() => null);
  const parsed = z.object({ datasetId: z.string().uuid(), file: z.instanceof(File) }).safeParse({ datasetId: form?.get("datasetId"), file: form?.get("file") });
  if (!parsed.success) return NextResponse.json({ error: "Choose a dataset and a CSV or XLSX file." }, { status: 400 });
  const { file } = parsed.data;
  if (file.size < 1 || file.size > MAX_IMPORT_BYTES) return NextResponse.json({ error: "Choose a non-empty file under 25 MiB." }, { status: 413 });
  const isAllowed = /\.csv$/i.test(file.name) || /\.xlsx$/i.test(file.name);
  if (!isAllowed) return NextResponse.json({ error: "Choose a .csv or .xlsx file." }, { status: 415 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const eicar = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
  if (bytes.includes(eicar)) return NextResponse.json({ error: "The file failed the malware check." }, { status: 422 });
  let scanStatus = "skipped_dev";
  if (isScannerConfigured()) {
    const scan = await postBytesToScanner(bytes);
    if (!scan.ok) return NextResponse.json({ error: scan.error ?? "The file could not be scanned." }, { status: 422 });
    scanStatus = scan.status;
  } else if (process.env.NODE_ENV === "production" || process.env.ATTACHMENT_SCAN_MODE === "strict") {
    return NextResponse.json({ error: "A file scanner must be configured before importing member data." }, { status: 503 });
  }

  const ctx = (await rlsContextForSession(access.session)) ?? {};
  const dataset = await withRlsContext(ctx, () => getDataset(access, parsed.data.datasetId));
  if (!dataset) return NextResponse.json({ error: "Dataset not found in this local." }, { status: 404 });
  const hash = createHash("sha256").update(bytes).digest("hex");
  const id = crypto.randomUUID();
  const storageKey = `${access.unionId}/${access.localId}/data-imports/${id}/${hash}`;
  await getObjectStorage().put(storageKey, bytes, mimeFor(file.name));
  let result: { status: 201; run: Awaited<ReturnType<typeof createImportRun>>; headers: string[] } | { status: 400; error: string };
  try {
    // Scan and private storage complete before parsing. Parsing stays outside
    // the short RLS transactions so a large workbook cannot pin a DB connection.
    const table = await parseUploadedTable(file.name, bytes);
    const run = await withRlsContext(ctx, () => createImportRun(access, { dataset, fileName: file.name, contentHash: hash, storageKey, scanStatus, table }));
    result = { status: 201, run, headers: table.headers };
  } catch (error) {
    await getObjectStorage().delete(storageKey);
    result = { status: 400, error: error instanceof Error ? error.message : "Could not process this file." };
  }
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  await auditLog.log({ userId: access.session.user.id, action: "data.import.create", resourceType: "data_import_run", resourceId: result.run.id, unionId: access.unionId, localId: access.localId, metadata: { rowCount: String(result.run.rowCount), scanStatus } });
  return NextResponse.json(result, { status: result.status });
}
