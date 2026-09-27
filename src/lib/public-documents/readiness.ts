import { eq, or } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { publicDocuments, publicDocumentVersions } from "@/lib/db/schema";
import { getObjectStorage, resolveAttachmentStorageMode } from "@/lib/attachments/storage";
import { PUBLIC_DOCUMENTS } from "./registry";
import { isApprovedPublicPolicy, isPublicDocumentPayload } from "./visibility";

export type PublicDocumentsReadiness = {
  ready: boolean;
  requiredMissing: string[];
  invalidActive: string[];
  checkedAt: string;
};

/** Checks public policy presence, rights, scan state, and durable bytes without exposing file content. */
export async function checkPublicDocumentsReadiness(): Promise<PublicDocumentsReadiness> {
  const checkedAt = new Date().toISOString();
  if (!isPostgresConfigured()) return { ready: false, requiredMissing: PUBLIC_DOCUMENTS.filter((doc) => doc.required).map((doc) => doc.slug), invalidActive: [], checkedAt };
  try {
    return await withRlsContext({}, async () => {
      const db = getDb();
      const now = new Date();
      const heads = await db.select().from(publicDocuments).where(or(eq(publicDocuments.status, "published"), eq(publicDocuments.status, "scheduled")));
      const versions = await db.select().from(publicDocumentVersions);
      const requiredSlugs = PUBLIC_DOCUMENTS.filter((doc) => doc.required).map((doc) => doc.slug);
      const active: Array<{ head: (typeof heads)[number]; version: (typeof versions)[number] | null }> = [];
      for (const head of heads) {
        if (head.archivedAt) continue;
        let versionNumber: number | null = null;
        if (head.status === "published" && (!head.publishAt || head.publishAt <= now)) versionNumber = head.publishedVersion ?? head.currentVersion;
        if (head.status === "scheduled" && head.publishAt && head.publishAt <= now) versionNumber = head.scheduledVersion ?? head.currentVersion;
        if (head.status === "scheduled" && head.publishAt && head.publishAt > now && head.publishedVersion) versionNumber = head.publishedVersion;
        if (versionNumber === null) continue;
        const version = versions.find((item) => item.documentId === head.id && item.version === versionNumber);
        if (version && !isPublicDocumentPayload(version.payload)) continue;
        active.push({ head, version: version ?? null });
      }
      const requiredMissing = requiredSlugs.filter((slug) => !active.some(({ head, version }) => head.slug === slug && version && version.payload.required));
      const invalidActive: string[] = [];
      if (process.env.NODE_ENV === "production" && resolveAttachmentStorageMode() !== "s3") invalidActive.push("Durable shared object storage is not configured");
      if (process.env.NODE_ENV === "production" && process.env.AUTH_MFA_ENABLED !== "true") invalidActive.push("Host MFA must be enabled for public publishing");
      for (const { head, version } of active) {
        if (!version) { invalidActive.push(`${head.slug}: current version missing`); continue; }
        const payload = version.payload;
        if (!isApprovedPublicPolicy(payload)) invalidActive.push(`${head.slug}: policy approval is not recorded`);
        if (!payload.title?.en?.trim() || !payload.title?.fr?.trim() || !payload.summary?.en?.trim() || !payload.summary?.fr?.trim()) invalidActive.push(`${head.slug}: placeholder metadata`);
        if (payload.kind === "policy" && (!payload.content?.en?.trim() || !payload.content?.fr?.trim())) invalidActive.push(`${head.slug}: bilingual policy content missing`);
        if (payload.kind === "external" && (!payload.externalUrl || !payload.externalUrl.startsWith("https://"))) invalidActive.push(`${head.slug}: invalid external source`);
        if (payload.kind === "file") {
          if (!payload.redistributionPermission?.trim()) invalidActive.push(`${head.slug}: redistribution rights missing`);
          if (!payload.storageKey || !payload.sha256 || payload.scanStatus !== "clean") invalidActive.push(`${head.slug}: file provenance or clean scan missing`);
          else if (!await getObjectStorage().exists(payload.storageKey)) invalidActive.push(`${head.slug}: published file missing from storage`);
        }
      }
      return { ready: requiredMissing.length === 0 && invalidActive.length === 0, requiredMissing, invalidActive, checkedAt };
    });
  } catch {
    return { ready: false, requiredMissing: PUBLIC_DOCUMENTS.filter((doc) => doc.required).map((doc) => doc.slug), invalidActive: ["Public document readiness query failed"], checkedAt };
  }
}
