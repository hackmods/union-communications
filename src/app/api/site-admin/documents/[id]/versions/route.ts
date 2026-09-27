import { createHash, randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requirePublicDocumentAdmin } from "@/lib/auth/public-document-admin";
import { auditLog } from "@/lib/audit/store";
import { sanitizeSvgBytes, validateAttachmentBytes } from "@/lib/attachments/file-validation";
import { scanAttachment } from "@/lib/attachments/scan";
import { buildStorageKey, getObjectStorage } from "@/lib/attachments/storage";
import { getDb } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { publicDocuments, publicDocumentVersions, type PublicDocumentPayload } from "@/lib/db/schema";
import { validateDocumentVisibility } from "@/lib/public-documents/visibility";

type Params = { params: Promise<{ id: string }> };
const MAX_BYTES = 10 * 1024 * 1024;

function obj(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function bilingual(value: unknown): value is { en: string; fr: string } {
  const item = obj(value);
  return typeof item?.en === "string" && Boolean(item.en.trim()) && item.en.length <= 3000 && typeof item.fr === "string" && Boolean(item.fr.trim()) && item.fr.length <= 3000;
}

export async function GET(_request: Request, { params }: Params) {
  const admin = await requirePublicDocumentAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const { id } = await params;
  const versions = await withRlsContext({ userId: admin.userId, platformAdmin: true, mfaVerified: true }, async () => getDb().select().from(publicDocumentVersions).where(eq(publicDocumentVersions.documentId, id)).orderBy(desc(publicDocumentVersions.version)));
  return NextResponse.json({ versions }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, { params }: Params) {
  const admin = await requirePublicDocumentAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const { id } = await params;
  let metadata: Record<string, unknown> | null = null;
  let file: File | null = null;
  try {
    const length = Number(request.headers.get("content-length"));
    if (!Number.isSafeInteger(length) || length < 1) return NextResponse.json({ error: "A bounded Content-Length is required for uploads" }, { status: 411 });
    if (length > MAX_BYTES + 64 * 1024) return NextResponse.json({ error: "Upload exceeds 10 MB" }, { status: 413 });
    const form = await request.formData();
    metadata = obj(JSON.parse(String(form.get("metadata") ?? "{}")));
    const incoming = form.get("file");
    if (incoming instanceof File) file = incoming;
  } catch { return NextResponse.json({ error: "Malformed version submission" }, { status: 400 }); }
  const raw = obj(metadata?.payload);
  if (!raw || !["policy", "file", "external"].includes(String(raw.kind)) || !bilingual(raw.title) || !bilingual(raw.summary) || !bilingual(raw.purpose) || !bilingual(raw.audience)) return NextResponse.json({ error: "A complete bilingual document payload is required" }, { status: 400 });
  const kind = raw.kind as PublicDocumentPayload["kind"];
  if (raw.requiresAcceptance === true && raw.acceptanceScope !== "individual" && raw.acceptanceScope !== "organization") return NextResponse.json({ error: "Choose whether acceptance is required from each individual or the contracting organization" }, { status: 400 });
  const language = raw.language;
  if (language !== "en" && language !== "fr" && language !== "en-fr") return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  const fields = [raw.format, raw.owner, raw.source];
  if (fields.some((value) => typeof value !== "string" || !value.trim() || value.length > 300)) return NextResponse.json({ error: "Format, owner, and source are required" }, { status: 400 });
  const title = raw.title as { en: string; fr: string };
  const summary = raw.summary as { en: string; fr: string };
  const purpose = raw.purpose as { en: string; fr: string };
  const audience = raw.audience as { en: string; fr: string };
  let content: { en: string; fr: string } | undefined;
  if (kind === "policy") {
    if (bilingual(raw.content)) content = raw.content;
    if (metadata?.status !== "draft" && !content) return NextResponse.json({ error: "Policy text must be present in English and French" }, { status: 400 });
    if (metadata?.status !== "draft" && metadata?.humanApproval !== true) return NextResponse.json({ error: "Confirm human approval for the policy wording" }, { status: 400 });
  }
  let externalUrl: string | undefined;
  if (kind === "external") {
    try { const url = new URL(String(raw.externalUrl ?? "")); if (url.protocol !== "https:") throw new Error(); externalUrl = url.toString(); } catch { return NextResponse.json({ error: "External source must be a valid HTTPS URL" }, { status: 400 }); }
  }
  const desiredStatus = metadata?.status;
  if (desiredStatus !== "draft" && desiredStatus !== "published" && desiredStatus !== "scheduled") return NextResponse.json({ error: "Invalid publication status" }, { status: 400 });
  const visibility = raw.visibility === undefined ? "public" : raw.visibility;
  if (visibility !== "public" && visibility !== "internal") return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
  const visibilityError = validateDocumentVisibility({ ...raw, visibility, kind, status: desiredStatus });
  if (visibilityError) return NextResponse.json({ error: visibilityError }, { status: 400 });
  const effectiveAt = typeof raw.effectiveAt === "string" && raw.effectiveAt ? new Date(raw.effectiveAt) : null;
  if (effectiveAt && Number.isNaN(effectiveAt.getTime())) return NextResponse.json({ error: "Invalid effective date" }, { status: 400 });
  const requestedPublishAt = metadata?.publishAt ? new Date(String(metadata.publishAt)) : effectiveAt ?? (desiredStatus === "published" ? new Date() : null);
  const publishAt = requestedPublishAt && effectiveAt ? new Date(Math.max(requestedPublishAt.getTime(), effectiveAt.getTime())) : requestedPublishAt;
  if (metadata?.publishAt && Number.isNaN(publishAt?.getTime())) return NextResponse.json({ error: "Invalid publication date" }, { status: 400 });
  if (desiredStatus === "scheduled" && !publishAt) return NextResponse.json({ error: "Scheduled versions need a publication time or effective date" }, { status: 400 });
  const status = desiredStatus === "published" && publishAt && publishAt > new Date() ? "scheduled" : desiredStatus;
  let payload: PublicDocumentPayload = {
    kind, visibility, title, summary, purpose, audience, format: String(raw.format), language, owner: String(raw.owner), source: String(raw.source),
    hosting: kind === "external" ? "External source" : "UnionOps", externalUrl, content,
    relatedGuide: typeof raw.relatedGuide === "string" ? raw.relatedGuide.slice(0, 300) : undefined,
    unionBrand: typeof raw.unionBrand === "string" ? raw.unionBrand.slice(0, 120) : undefined,
    linkedSurfaces: Array.isArray(raw.linkedSurfaces) ? raw.linkedSurfaces.filter((surface): surface is string => typeof surface === "string").map((surface) => surface.slice(0, 160)).slice(0, 100) : undefined,
    effectiveAt: typeof raw.effectiveAt === "string" ? raw.effectiveAt : undefined,
    requiresAcceptance: raw.requiresAcceptance === true,
    acceptanceScope: raw.requiresAcceptance === true ? raw.acceptanceScope as "individual" | "organization" : undefined,
    humanApproved: metadata?.humanApproval === true,
    required: raw.required === true,
  };
  if (kind === "file") {
    if (!file || file.size < 1 || file.size > MAX_BYTES) return NextResponse.json({ error: "A 1 byte to 10 MB file is required" }, { status: 413 });
    const rights = typeof raw.redistributionPermission === "string" ? raw.redistributionPermission.trim().slice(0, 500) : "";
    if (desiredStatus !== "draft" && !rights) return NextResponse.json({ error: "Record redistribution rights before publishing file bytes" }, { status: 400 });
    const uploadedBytes = Buffer.from(await file.arrayBuffer());
    let bytes: Buffer;
    try { bytes = file.type === "image/svg+xml" ? sanitizeSvgBytes(uploadedBytes) : uploadedBytes; }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "SVG sanitization failed" }, { status: 415 }); }
    if (bytes.length > MAX_BYTES) return NextResponse.json({ error: "Sanitized file exceeds 10 MB" }, { status: 413 });
    const signatureError = validateAttachmentBytes(file.type, bytes);
    if (signatureError) return NextResponse.json({ error: signatureError }, { status: 415 });
    const scan = await scanAttachment({ fileName: file.name, mimeType: file.type, sizeBytes: bytes.length, contentBytes: bytes });
    if (!scan.ok) return NextResponse.json({ error: scan.error ?? "Malware scan failed" }, { status: 422 });
    if (status !== "draft" && scan.status !== "clean") return NextResponse.json({ error: "A clean malware scan is required before public release" }, { status: 503 });
    const [head] = await withRlsContext({ userId: admin.userId, platformAdmin: true, mfaVerified: true }, () => getDb().select().from(publicDocuments).where(eq(publicDocuments.id, id)).limit(1));
    if (!head) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (head.hostWidePolicy) return NextResponse.json({ error: "Host-wide policies must remain policy records" }, { status: 400 });
    const version = head.currentVersion + 1;
    const versionId = `${id}-v${version}`;
    const key = buildStorageKey({ unionId: "unionops-platform", localId: "public-library", scope: "document", scopeId: head.slug, attachmentId: `${versionId}-${randomUUID()}`, fileName: file.name });
    payload = { ...payload, fileName: file.name.replace(/[\r\n\\/]/g, "_").slice(0, 180), mimeType: file.type, sizeBytes: bytes.length, storageKey: key, sha256: createHash("sha256").update(bytes).digest("hex"), scanStatus: scan.status, redistributionPermission: rights };
    try {
      await getObjectStorage().put(key, bytes, file.type);
      await withRlsContext({ userId: admin.userId, platformAdmin: true, mfaVerified: true }, async () => getDb().transaction(async (tx) => {
        await tx.insert(publicDocumentVersions).values({ id: versionId, documentId: id, version, payload, createdById: admin.userId });
        await tx.update(publicDocuments).set({ currentVersion: version, ...(desiredStatus === "draft" ? {} : { status, publishAt, scheduledVersion: status === "scheduled" ? version : null, publishedVersion: status === "published" ? version : head.publishedVersion }), archivedAt: null, updatedById: admin.userId, updatedAt: new Date() }).where(eq(publicDocuments.id, id));
      }));
    } catch (error) { await getObjectStorage().delete(key); return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save new version" }, { status: 500 }); }
  } else {
    if (file) return NextResponse.json({ error: "Only hosted file versions accept uploaded bytes" }, { status: 400 });
    const [head] = await withRlsContext({ userId: admin.userId, platformAdmin: true, mfaVerified: true }, () => getDb().select().from(publicDocuments).where(eq(publicDocuments.id, id)).limit(1));
    if (!head) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (head.hostWidePolicy && (kind !== "policy" || head.brandPresetId)) return NextResponse.json({ error: "Host-wide policies cannot be union brand variants" }, { status: 400 });
    const version = head.currentVersion + 1;
    try {
      await withRlsContext({ userId: admin.userId, platformAdmin: true, mfaVerified: true }, async () => getDb().transaction(async (tx) => {
        await tx.insert(publicDocumentVersions).values({ id: `${id}-v${version}`, documentId: id, version, payload, createdById: admin.userId });
        await tx.update(publicDocuments).set({ currentVersion: version, ...(desiredStatus === "draft" ? {} : { status, publishAt, scheduledVersion: status === "scheduled" ? version : null, publishedVersion: status === "published" ? version : head.publishedVersion }), archivedAt: null, updatedById: admin.userId, updatedAt: new Date() }).where(eq(publicDocuments.id, id));
      }));
    } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save new version" }, { status: 500 }); }
  }
  const [savedHead] = await withRlsContext({ userId: admin.userId, platformAdmin: true, mfaVerified: true }, () => getDb().select({ slug: publicDocuments.slug }).from(publicDocuments).where(eq(publicDocuments.id, id)).limit(1));
  await withRlsContext({ userId: admin.userId, platformAdmin: true, mfaVerified: true }, () => auditLog.log({ userId: admin.userId, action: "site_admin.public_document.version", resourceType: "public_document", resourceId: id, metadata: { slug: savedHead?.slug ?? "", status, visibility: payload.visibility ?? "public", rightsRecorded: String(Boolean(payload.redistributionPermission)) } }));
  return NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
