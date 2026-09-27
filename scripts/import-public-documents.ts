import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { eq } from "drizzle-orm";
import { buildStorageKey, getObjectStorage } from "@/lib/attachments/storage";
import { sanitizeSvgBytes, validateAttachmentBytes } from "@/lib/attachments/file-validation";
import { scanAttachment } from "@/lib/attachments/scan";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { publicDocuments, publicDocumentVersions, type PublicDocumentPayload } from "@/lib/db/schema";
import { localizedPublicDocument, PUBLIC_DOCUMENTS } from "@/lib/public-documents/registry";
import enMessages from "../messages/en.json";
import frMessages from "../messages/fr.json";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";

function readPath(source: unknown, path: string): string | undefined {
  let value: unknown = source;
  for (const part of path.split(".")) {
    if (!value || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return typeof value === "string" ? value : undefined;
}

/** Snapshot the existing exact EN/FR page strings into the managed baseline version. */
function baselinePolicyContent(slug: string): { en: string; fr: string } | undefined {
  const hub = isOfficerHubPublic();
  const keys: Record<string, string[]> = {
    privacy: [
      "privacyPage.title", "privacyPage.subtitle", `privacyPage.leadTitle${hub ? "Hub" : "CommsOnly"}`, `privacyPage.leadBody${hub ? "Hub" : "CommsOnly"}`,
      "privacyPage.commsTitle", "privacyPage.comms1", "privacyPage.comms2", "privacyPage.comms3", "privacyPage.comms4",
      ...(hub ? ["privacyPage.hubTitle", "privacyPage.hubIntro", "privacyPage.hubSelfHost", "privacyPage.hubHybrid", "privacyPage.hubDemo"] : []),
      "privacyPage.ontarioTitle", `privacyPage.ontario${hub ? "Hub" : "CommsOnly"}`,
      "privacyPage.responsibilitiesTitle", "privacyPage.responsibilitiesBody", "privacyPage.photoConsentLink", "privacyPage.installTitle", "privacyPage.installBody", "privacyPage.installLink", "privacyPage.siteFeedbackTitle", "privacyPage.siteFeedbackBody", "privacyPage.siteFeedbackLink", "privacyPage.securityTitle", "privacyPage.securityBody", "privacyPage.securityLink", "privacyPage.contactTitle", "privacyPage.contactBody", "privacyPage.supportLink",
    ],
    security: [
      "securityPage.title", "securityPage.subtitle", "securityPage.leadTitle", "securityPage.leadBody", "securityPage.commsTitle", "securityPage.comms1", "securityPage.comms2", "securityPage.comms3", "securityPage.transitTitle", "securityPage.transit1", "securityPage.transit2", "securityPage.transit3",
      ...(hub ? ["securityPage.hubTitle", "securityPage.hubIntro", "securityPage.hub1", "securityPage.hub2", "securityPage.hub3", "securityPage.hub4", "securityPage.hub5", "securityPage.portalTitle", "securityPage.portalIntro", "securityPage.portal1", "securityPage.portal2", "securityPage.portal3", "securityPage.portal4", "securityPage.honestTitle", "securityPage.honestBody", "securityPage.operatorTitle", "securityPage.operator1", "securityPage.operator2", "securityPage.operator3", "securityPage.operator4"] : []),
      "securityPage.reportTitle", "securityPage.reportBody", "securityPage.supportLink", "securityPage.privacyTitle", "securityPage.privacyBody", "securityPage.privacyLink",
    ],
    accessibility: ["accessibility.title", "accessibility.subtitle", "accessibility.commitment.title", "accessibility.commitment.body", "accessibility.features.title", "accessibility.features.semanticHtml", "accessibility.features.keyboardNav", "accessibility.features.focusIndicators", "accessibility.features.contrast", "accessibility.features.altText", "accessibility.features.reducedMotion", "accessibility.features.bilingual", "accessibility.features.displaySettings", "accessibility.features.skipLink", "accessibility.features.altTextTool", "accessibility.limitations.title", "accessibility.limitations.body", "accessibility.feedback.title", "accessibility.feedback.body", "accessibility.feedback.link"],
  };
  const selected = keys[slug];
  if (!selected) return undefined;
  const serialize = (messages: unknown) => {
    const paragraphs: string[] = [];
    for (const key of selected) {
      const value = readPath(messages, key);
      if (!value?.trim()) continue;
      if (key.endsWith("Link") && paragraphs.length) paragraphs[paragraphs.length - 1] += ` ${value}.`;
      else paragraphs.push(value);
    }
    return paragraphs.join("\n\n");
  };
  return { en: serialize(enMessages), fr: serialize(frMessages) };
}

async function main() {
  if (process.env.PUBLIC_DOCUMENT_IMPORT !== "1") throw new Error("Set PUBLIC_DOCUMENT_IMPORT=1 to confirm the one-time registry import");
  if (!isPostgresConfigured()) throw new Error("DATABASE_URL must point at the Postgres owner connection for baseline import");
  const db = getDb();
  const storage = getObjectStorage();
  let imported = 0;
  let skipped = 0;
  for (const source of PUBLIC_DOCUMENTS) {
    const [existing] = await db.select({ id: publicDocuments.id }).from(publicDocuments).where(eq(publicDocuments.slug, source.slug)).limit(1);
    if (existing) { skipped += 1; continue; }
    const en = localizedPublicDocument(source.slug, "en")!;
    const fr = localizedPublicDocument(source.slug, "fr")!;
    const id = `pubdoc-baseline-${source.slug}`;
    const versionId = `${id}-v1`;
    let payload: PublicDocumentPayload = {
      kind: source.slug === "privacy" || source.slug === "security" || source.slug === "accessibility" ? "policy" : source.externalUrl ? "external" : "file",
      title: { en: en.title, fr: fr.title }, summary: { en: en.summary, fr: fr.summary },
      purpose: { en: en.purpose, fr: fr.purpose }, audience: { en: en.audience, fr: fr.audience },
      format: source.format, language: source.language, owner: source.owner, source: source.source, hosting: source.hosting,
      externalUrl: source.externalUrl, relatedGuide: source.relatedGuide, unionBrand: source.unionBrand,
      linkedSurfaces: source.linkedSurfaces ? [...source.linkedSurfaces] : [], requiresAcceptance: false,
      humanApproved: false,
      required: source.required ?? false,
      ...(source.slug === "privacy" || source.slug === "security" || source.slug === "accessibility" ? { content: baselinePolicyContent(source.slug) } : {}),
    };
    if (source.file) {
      const filePath = resolve(process.cwd(), "public", ...source.file.split("/"));
      const publicRoot = resolve(process.cwd(), "public") + sep;
      if (!filePath.startsWith(publicRoot)) throw new Error(`Refusing file outside public root: ${source.slug}`);
      const sourceBytes = await readFile(filePath);
      const mimeType = source.file.toLowerCase().endsWith(".svg") ? "image/svg+xml" : "text/csv";
      const bytes = mimeType === "image/svg+xml" ? sanitizeSvgBytes(sourceBytes) : sourceBytes;
      const signatureError = validateAttachmentBytes(mimeType, bytes);
      if (signatureError) throw new Error(`${source.slug}: ${signatureError}`);
      const fileName = source.file.split("/").at(-1)!;
      const scan = await scanAttachment({ fileName, mimeType, sizeBytes: bytes.length, contentBytes: bytes });
      if (!scan.ok || scan.status !== "clean") throw new Error(`${source.slug}: a configured scanner must return clean (${scan.error ?? scan.status})`);
      const storageKey = buildStorageKey({ unionId: "unionops-platform", localId: "public-library", scope: "document", scopeId: source.slug, attachmentId: `version-1-${randomUUID()}`, fileName });
      await storage.put(storageKey, bytes, mimeType);
      payload = { ...payload, fileName, mimeType, sizeBytes: bytes.length, storageKey, sha256: createHash("sha256").update(bytes).digest("hex"), scanStatus: scan.status, redistributionPermission: "UnionOps-authored template or anonymized UnionOps sample; contains no third-party bytes or marks" };
    }
    const brandPresetId = source.unionBrand === "OPSEU / SEFPO" ? "opseu" : null;
    try {
      await db.transaction(async (tx) => {
        await tx.insert(publicDocuments).values({ id, slug: source.slug, status: "published", currentVersion: 1, publishedVersion: 1, scheduledVersion: null, brandPresetId, hostWidePolicy: payload.kind === "policy", publishAt: new Date(), createdById: "registry-import", updatedById: "registry-import" });
        await tx.insert(publicDocumentVersions).values({ id: versionId, documentId: id, version: 1, payload, createdById: "registry-import" });
      });
    } catch (error) {
      if (payload.storageKey) await storage.delete(payload.storageKey);
      throw error;
    }
    imported += 1;
  }
  let termsDraft = 0;
  const [existingTerms] = await db.select({ id: publicDocuments.id }).from(publicDocuments).where(eq(publicDocuments.slug, "terms")).limit(1);
  if (!existingTerms) {
    const id = "pubdoc-terms-draft";
    const payload: PublicDocumentPayload = {
      kind: "policy", title: { en: "Terms of Use (draft)", fr: "Conditions d’utilisation (brouillon)" },
      summary: { en: "Draft record. No approved terms text is available for publication.", fr: "Fiche brouillon. Aucun texte de conditions approuvé n’est disponible pour publication." },
      purpose: { en: "Review approved terms before publication", fr: "Faire approuver les conditions avant publication" },
      audience: { en: "UnionOps users", fr: "Personnes qui utilisent UnionOps" }, format: "Web page", language: "en-fr",
      owner: "UnionOps", source: "UnionOps policy draft", hosting: "UnionOps", linkedSurfaces: [], required: false,
      requiresAcceptance: false, humanApproved: false,
    };
    await db.transaction(async (tx) => {
      await tx.insert(publicDocuments).values({ id, slug: "terms", status: "draft", currentVersion: 1, publishedVersion: null, scheduledVersion: null, brandPresetId: null, hostWidePolicy: true, publishAt: null, createdById: "registry-import", updatedById: "registry-import" });
      await tx.insert(publicDocumentVersions).values({ id: `${id}-v1`, documentId: id, version: 1, payload, createdById: "registry-import" });
    });
    termsDraft = 1;
  }
  console.log(`[public-document-import] imported=${imported} skipped=${skipped} termsDraft=${termsDraft} registryTotal=${PUBLIC_DOCUMENTS.length}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
