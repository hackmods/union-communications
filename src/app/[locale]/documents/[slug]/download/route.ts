import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { publicDocument } from "@/lib/public-documents/registry";
import { publicDocumentBySlug } from "@/lib/public-documents/database";
import { getObjectStorage } from "@/lib/attachments/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug } = await params;
  const managed = await publicDocumentBySlug(slug, "en");
  if (managed && "unpublished" in managed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (managed && "payload" in managed && managed.payload.storageKey) {
    if (managed.payload.scanStatus !== "clean") return NextResponse.json({ error: "Published file is unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    const stream = await getObjectStorage().getStream(managed.payload.storageKey);
    if (!stream) return NextResponse.json({ error: "Published file is unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    const filename = (managed.payload.fileName ?? slug).replace(/[\r\n"\\]/g, "_");
    return new NextResponse(stream, { headers: { "Content-Type": managed.payload.mimeType ?? "application/octet-stream", ...(managed.payload.sizeBytes ? { "Content-Length": String(managed.payload.sizeBytes) } : {}), "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "public, max-age=0, must-revalidate", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  }
  const doc = publicDocument(slug);
  if (!doc?.file || (managed && "payload" in managed && managed.payload.kind !== "file")) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const filePath = path.resolve(process.cwd(), "public", ...doc.file.split("/"));
  const publicRoot = path.resolve(process.cwd(), "public") + path.sep;
  if (!filePath.startsWith(publicRoot)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const bytes = await readFile(filePath);
    const filename = path.basename(filePath).replace(/[\r\n"\\]/g, "_");
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": doc.format === "CSV" ? "text/csv; charset=utf-8" : "application/octet-stream", "Content-Length": String(bytes.length), "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "public, max-age=0, must-revalidate", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  } catch {
    return NextResponse.json({ error: "Published file is unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
