import { and, eq, sql } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { publicDocuments, publicDocumentVersions, type PublicDocumentPayload } from "@/lib/db/schema";
import { localizedPublicDocument, type PublicDocument } from "./registry";

export type StoredPublicDocument = {
  id: string;
  slug: string;
  status: "draft" | "scheduled" | "published" | "archived";
  currentVersion: number;
  publishedVersion: number | null;
  scheduledVersion: number | null;
  publishAt: Date | null;
  archivedAt: Date | null;
  brandPresetId: string | null;
  hostWidePolicy: boolean;
  payload: PublicDocumentPayload;
  versionId: string;
};

function isLive(status: string, publishAt: Date | null, publishedVersion: number | null, archivedAt: Date | null, now: Date) {
  return archivedAt === null && ((status === "published" && (!publishAt || publishAt <= now)) || (status === "scheduled" && Boolean((publishAt && publishAt <= now) || publishedVersion)));
}

function fromPayload(slug: string, payload: PublicDocumentPayload, locale: string, brandPresetId?: string | null): PublicDocument {
  const fr = locale === "fr";
  return {
    slug,
    title: payload.title[fr ? "fr" : "en"],
    summary: payload.summary[fr ? "fr" : "en"],
    purpose: payload.purpose[fr ? "fr" : "en"],
    audience: payload.audience[fr ? "fr" : "en"],
    format: payload.format,
    language: payload.language,
    owner: payload.owner,
    source: payload.source,
    hosting: payload.hosting,
    version: "Published version",
    effectiveDate: payload.effectiveAt,
    currency: payload.externalUrl ? (fr ? "Vérifier la version actuelle auprès de la source officielle" : "Check the official source for the current version") : (fr ? "Version publiée par UnionOps" : "Published by UnionOps"),
    externalUrl: payload.externalUrl,
    file: payload.fileName,
    relatedGuide: payload.relatedGuide,
    unionBrand: payload.unionBrand ?? (brandPresetId ?? undefined),
    linkedSurfaces: payload.linkedSurfaces,
    inlineContent: payload.content?.[fr ? "fr" : "en"],
    requiresAcceptance: payload.requiresAcceptance ?? false,
    required: payload.required ?? false,
  };
}

async function rowsForSlug(slug?: string, currentVersion = false) {
  if (!isPostgresConfigured()) return [];
  const db = getDb();
  const conditions = slug ? [eq(publicDocuments.slug, slug)] : [];
  const selectedVersion = currentVersion ? sql<number>`${publicDocuments.currentVersion}` : sql<number>`CASE
    WHEN ${publicDocuments.status} = 'scheduled' AND ${publicDocuments.publishAt} > now() THEN COALESCE(${publicDocuments.publishedVersion}, NULL)
    WHEN ${publicDocuments.status} = 'scheduled' THEN COALESCE(${publicDocuments.scheduledVersion}, ${publicDocuments.currentVersion})
    WHEN ${publicDocuments.status} = 'published' THEN COALESCE(${publicDocuments.publishedVersion}, ${publicDocuments.currentVersion})
    ELSE ${publicDocuments.currentVersion}
  END`;
  return db.select({ head: publicDocuments, version: publicDocumentVersions })
    .from(publicDocuments)
    .leftJoin(publicDocumentVersions, and(eq(publicDocumentVersions.documentId, publicDocuments.id), eq(publicDocumentVersions.version, selectedVersion)))
    .where(conditions.length ? and(...conditions) : undefined);
}

/** Returns admin-readable records, including drafts and publication history heads. */
export async function listStoredPublicDocuments(): Promise<StoredPublicDocument[]> {
  const rows = await rowsForSlug(undefined, true);
  return rows.flatMap(({ head, version }) => version ? [{ id: head.id, slug: head.slug, status: head.status, currentVersion: head.currentVersion, publishedVersion: head.publishedVersion, scheduledVersion: head.scheduledVersion, publishAt: head.publishAt, archivedAt: head.archivedAt, brandPresetId: head.brandPresetId, hostWidePolicy: head.hostWidePolicy, payload: version.payload, versionId: version.id }] : []);
}

/** DB publication overlays registry content by slug; future schedules go live at their timestamp. */
export async function publicDocumentBySlug(slug: string, locale: string): Promise<{ document: PublicDocument; payload: PublicDocumentPayload; versionId: string } | { unpublished: true } | null> {
  const [row] = await rowsForSlug(slug);
  if (!row) {
    const baseline = localizedPublicDocument(slug, locale);
    return baseline ? { document: baseline, payload: { kind: baseline.inlineContent ? "policy" : baseline.externalUrl ? "external" : "file", title: { en: baseline.title, fr: baseline.title }, summary: { en: baseline.summary, fr: baseline.summary }, purpose: { en: baseline.purpose, fr: baseline.purpose }, audience: { en: baseline.audience, fr: baseline.audience }, format: baseline.format, language: baseline.language, owner: baseline.owner, source: baseline.source, hosting: baseline.hosting, externalUrl: baseline.externalUrl, fileName: baseline.file, relatedGuide: baseline.relatedGuide, unionBrand: baseline.unionBrand, linkedSurfaces: baseline.linkedSurfaces, required: baseline.required }, versionId: `registry-${slug}-baseline` } : null;
  }
  const live = isLive(row.head.status, row.head.publishAt, row.head.publishedVersion, row.head.archivedAt, new Date());
  if (!live || !row.version) return { unpublished: true };
  return { document: { ...fromPayload(slug, row.version.payload, locale, row.head.brandPresetId), version: `v${row.version.version}` }, payload: row.version.payload, versionId: row.version.id };
}

export async function listPublicDocuments(locale: string): Promise<PublicDocument[]> {
  const rows = await rowsForSlug();
  const heads = new Map(rows.map((row) => [row.head.slug, row]));
  const baselines = (await import("./registry")).PUBLIC_DOCUMENTS
    .filter((doc) => !heads.has(doc.slug))
    .map((doc) => localizedPublicDocument(doc.slug, locale)!)
    .filter(Boolean);
  const now = new Date();
  const stored = rows.flatMap(({ head, version }) => version && isLive(head.status, head.publishAt, head.publishedVersion, head.archivedAt, now) ? [fromPayload(head.slug, version.payload, locale, head.brandPresetId)] : []);
  return [...baselines, ...stored].sort((a, b) => a.title.localeCompare(b.title, locale === "fr" ? "fr-CA" : "en-CA"));
}

export function mapStoredPublicDocument(row: StoredPublicDocument, locale: string) {
  return { ...row, document: fromPayload(row.slug, row.payload, locale, row.brandPresetId) };
}
