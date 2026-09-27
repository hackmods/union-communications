import { NextResponse } from "next/server";
import { publicDocument } from "@/lib/public-documents/registry";
import { publicDocumentBySlug } from "@/lib/public-documents/database";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug } = await params;
  const managed = await publicDocumentBySlug(slug, "en");
  if (managed && "unpublished" in managed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const url = managed && "payload" in managed ? managed.payload.externalUrl : publicDocument(slug)?.externalUrl;
  if (!url || !url.startsWith("https://")) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.redirect(url, { status: 307, headers: { "Cache-Control": "public, max-age=0, must-revalidate" } });
}
