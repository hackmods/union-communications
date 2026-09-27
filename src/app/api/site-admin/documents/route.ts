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
import { PUBLIC_DOCUMENTS } from "@/lib/public-documents/registry";
import { getUnionPreset } from "@/lib/constants/unionPresets";

const MAX_BYTES = 10 * 1024 * 1024;
type ParamsPayload = Omit<PublicDocumentPayload, "fileName" | "mimeType" | "sizeBytes" | "storageKey" | "sha256" | "scanStatus">;

function recordOf(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function parsePayload(input: unknown, requireHumanApproval: boolean): { payload?: ParamsPayload; error?: string } {
  const data = recordOf(input);
  if (!data) return { error: "Document metadata is required" };
  const kind = data.kind;
  if (kind !== "policy" && kind !== "file" && kind !== "external") return { error: "kind must be policy, file, or external" };
  const bilingual = (name: string) => {
    const value = recordOf(data[name]);
    const en = typeof value?.en === "string" ? value.en.trim() : "";
    const fr = typeof value?.fr === "string" ? value.fr.trim() : "";
    return en && fr && en.length <= 3000 && fr.length <= 3000 ? { en, fr } : null;
  };
  const title = bilingual("title");
  const summary = bilingual("summary");
  const purpose = bilingual("purpose");
  const audience = bilingual("audience");
  if (!title || !summary || !purpose || !audience) return { error: "English and French title, summary, purpose, and audience are required" };
  const format = typeof data.format === "string" ? data.format.trim() : "";
  const owner = typeof data.owner === "string" ? data.owner.trim() : "";
  const source = typeof data.source === "string" ? data.source.trim() : "";
  const language = data.language;
  const hosting = kind === "external" ? "External source" : "UnionOps";
  if (!format || format.length > 80 || !owner || owner.length > 200 || !source || source.length > 300) return { error: "Format, owner, and source are required" };
  if (language !== "en" && language !== "fr" && language !== "en-fr") return { error: "language must be en, fr, or en-fr" };
  let externalUrl: string | undefined;
  if (kind === "external") {
    try { const url = new URL(String(data.externalUrl ?? "")); if (url.protocol !== "https:") throw new Error(); externalUrl = url.toString(); }
    catch { return { error: "External documents must use a valid HTTPS source URL" }; }
  }
  let content: { en: string; fr: string } | undefined;
  if (kind === "policy") {
    content = bilingual("content") ?? undefined;
    if (requireHumanApproval && !content) return { error: "Policy text needs approved English and French content" };
    if (requireHumanApproval && data.humanApproval !== true) return { error: "Confirm that the legal wording has human approval before publishing" };
  }
  let effectiveAt: string | undefined;
  if (typeof data.effectiveAt === "string" && data.effectiveAt) {
    const parsedDate = new Date(data.effectiveAt);
    if (Number.isNaN(parsedDate.getTime())) return { error: "effectiveAt must be a valid ISO date" };
    effectiveAt = parsedDate.toISOString();
  }
  return { payload: {
    kind, title, summary, purpose, audience, format, language, owner, source, hosting,
    externalUrl, content,
    redistributionPermission: typeof data.redistributionPermission === "string" ? data.redistributionPermission.trim().slice(0, 500) : undefined,
    relatedGuide: typeof data.relatedGuide === "string" ? data.relatedGuide.trim().slice(0, 300) : undefined,
    unionBrand: typeof data.unionBrand === "string" ? data.unionBrand.trim().slice(0, 120) : undefined,
    linkedSurfaces: Array.isArray(data.linkedSurfaces) ? data.linkedSurfaces.filter((surface): surface is string => typeof surface === "string").map((surface) => surface.slice(0, 160)).slice(0, 100) : undefined,
    requiresAcceptance: data.requiresAcceptance === true,
    humanApproved: data.humanApproval === true,
    required: data.required === true,
    effectiveAt,
  } };
}

function validSlug(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100;
}

export async function GET() {
  const admin = await requirePublicDocumentAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const documents = await withRlsContext({ userId: admin.userId, platformAdmin: true, mfaVerified: true }, async () => {
    const db = getDb();
    const heads = await db.select().from(publicDocuments).orderBy(desc(publicDocuments.updatedAt));
    const versions = await db.select().from(publicDocumentVersions).orderBy(desc(publicDocumentVersions.version));
    return heads.map((head) => { const payload = versions.find((version) => version.documentId === head.id && version.version === head.currentVersion)?.payload ?? null; return { ...head, payload, registeredSurface: payload?.linkedSurfaces ?? PUBLIC_DOCUMENTS.find((doc) => doc.slug === head.slug)?.linkedSurfaces ?? [] }; });
  });
  return NextResponse.json({ documents }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const admin = await requirePublicDocumentAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  let fields: Record<string, unknown>;
  let file: File | null = null;
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const length = Number(request.headers.get("content-length"));
      if (!Number.isSafeInteger(length) || length < 1) return NextResponse.json({ error: "A bounded Content-Length is required for uploads" }, { status: 411 });
      if (length > MAX_BYTES + 64 * 1024) return NextResponse.json({ error: "Upload exceeds 10 MB" }, { status: 413 });
      const form = await request.formData();
      const metadata = JSON.parse(String(form.get("metadata") ?? "{}"));
      fields = recordOf(metadata) ?? {};
      const candidate = form.get("file");
      if (candidate instanceof File) file = candidate;
    } else {
      const body = await request.json();
      fields = recordOf(body) ?? {};
    }
  } catch { return NextResponse.json({ error: "Malformed document submission" }, { status: 400 }); }
  const slug = fields.slug;
  if (!validSlug(slug)) return NextResponse.json({ error: "slug must use lowercase letters, numbers, and hyphens" }, { status: 400 });
  if (PUBLIC_DOCUMENTS.some((doc) => doc.slug === slug)) return NextResponse.json({ error: "This baseline registry record is read-only until it is imported into the managed library" }, { status: 409 });
  const desiredStatus = fields.status;
  if (desiredStatus !== "draft" && desiredStatus !== "published" && desiredStatus !== "scheduled") return NextResponse.json({ error: "status must be draft, published, or scheduled" }, { status: 400 });
  const parsed = parsePayload(fields.payload, desiredStatus !== "draft");
  if (!parsed.payload) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const payload = parsed.payload as PublicDocumentPayload;
  const brandPresetId = typeof fields.brandPresetId === "string" && fields.brandPresetId.trim() ? fields.brandPresetId.trim() : null;
  const hostWidePolicy = fields.hostWidePolicy === true;
  if (hostWidePolicy && (payload.kind !== "policy" || brandPresetId)) return NextResponse.json({ error: "Host-wide policies cannot use a union brand preset" }, { status: 400 });
  if (brandPresetId && !getUnionPreset(brandPresetId)) return NextResponse.json({ error: "Choose an existing Brand Kit preset or leave the selection neutral" }, { status: 400 });
  if (brandPresetId && !payload.unionBrand) return NextResponse.json({ error: "Provide the union brand label for a branded variant" }, { status: 400 });
  if (payload.kind === "file") {
    if (!file || file.size < 1 || file.size > MAX_BYTES) return NextResponse.json({ error: "A 1 byte to 10 MB file is required" }, { status: 413 });
    if (desiredStatus !== "draft" && !payload.redistributionPermission) return NextResponse.json({ error: "Record redistribution rights before publishing file bytes" }, { status: 400 });
  } else if (file) return NextResponse.json({ error: "Only file records can contain uploaded bytes" }, { status: 400 });
  const requestedPublishAt = fields.publishAt ? new Date(String(fields.publishAt)) : payload.effectiveAt ? new Date(payload.effectiveAt) : desiredStatus === "published" ? new Date() : null;
  const publishAt = requestedPublishAt && payload.effectiveAt ? new Date(Math.max(requestedPublishAt.getTime(), new Date(payload.effectiveAt).getTime())) : requestedPublishAt;
  if (fields.publishAt && Number.isNaN(publishAt?.getTime())) return NextResponse.json({ error: "publishAt must be a valid date" }, { status: 400 });
  if (desiredStatus === "scheduled" && !publishAt) return NextResponse.json({ error: "Scheduled records need a publication time or effective date" }, { status: 400 });
  const status = desiredStatus === "published" && publishAt && publishAt > new Date() ? "scheduled" : desiredStatus;

  let objectKey: string | undefined;
  let bytes: Buffer | undefined;
  if (file) {
    const uploadedBytes = Buffer.from(await file.arrayBuffer());
    if (uploadedBytes.length !== file.size) return NextResponse.json({ error: "Uploaded size does not match the received bytes" }, { status: 400 });
    try { bytes = file.type === "image/svg+xml" ? sanitizeSvgBytes(uploadedBytes) : uploadedBytes; }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "SVG sanitization failed" }, { status: 415 }); }
    if (bytes.length > MAX_BYTES) return NextResponse.json({ error: "Sanitized file exceeds 10 MB" }, { status: 413 });
    const signatureError = validateAttachmentBytes(file.type, bytes);
    if (signatureError) return NextResponse.json({ error: signatureError }, { status: 415 });
    const scan = await scanAttachment({ fileName: file.name, mimeType: file.type, sizeBytes: bytes.length, contentBytes: bytes });
    if (!scan.ok) return NextResponse.json({ error: scan.error ?? "Malware scan failed" }, { status: 422 });
    if (status !== "draft" && scan.status !== "clean") return NextResponse.json({ error: "A clean malware scan is required before public release" }, { status: 503 });
    objectKey = buildStorageKey({ unionId: "unionops-platform", localId: "public-library", scope: "document", scopeId: String(slug), attachmentId: `v1-${randomUUID()}`, fileName: file.name });
    payload.fileName = file.name.replace(/[\r\n\\/]/g, "_").slice(0, 180);
    payload.mimeType = file.type;
    payload.sizeBytes = bytes.length;
    payload.storageKey = objectKey;
    payload.sha256 = createHash("sha256").update(bytes).digest("hex");
    payload.scanStatus = scan.status;
  }
  const id = `pubdoc-${randomUUID()}`;
  const versionId = `${id}-v1`;
  try {
    if (bytes && objectKey) await getObjectStorage().put(objectKey, bytes, file!.type);
    await withRlsContext({ userId: admin.userId, platformAdmin: true, mfaVerified: true }, async () => {
      const db = getDb();
      await db.transaction(async (tx) => {
        await tx.insert(publicDocuments).values({ id, slug, status, currentVersion: 1, publishedVersion: status === "published" ? 1 : null, scheduledVersion: status === "scheduled" ? 1 : null, brandPresetId, hostWidePolicy, publishAt, createdById: admin.userId, updatedById: admin.userId });
        await tx.insert(publicDocumentVersions).values({ id: versionId, documentId: id, version: 1, payload, createdById: admin.userId });
      });
      await auditLog.log({ userId: admin.userId, action: "site_admin.public_document.create", resourceType: "public_document", resourceId: id, metadata: { slug, status, kind: payload.kind, brandPresetId, rightsRecorded: Boolean(payload.redistributionPermission) } });
    });
  } catch (error) {
    if (objectKey) await getObjectStorage().delete(objectKey);
    const message = error instanceof Error && error.message.includes("public_documents_slug_uidx") ? "A document already uses this slug" : "Could not save public document";
    return NextResponse.json({ error: message }, { status: 409 });
  }
  return NextResponse.json({ id, slug, status, version: 1 }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
