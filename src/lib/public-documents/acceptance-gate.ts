import { and, eq, or, sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { publicDocuments, publicDocumentVersions, publicDocumentAcceptances } from "@/lib/db/schema";
import { withRlsContext } from "@/lib/db/rls-context";

export type AcceptanceRequirement = { slug: string; title: string; versionId: string; requiresAcceptance: true };

/** Returns only the current, effective publication versions this identity has not accepted. */
export async function outstandingDocumentAcceptances(session: Session, locale = "en"): Promise<AcceptanceRequirement[]> {
  const userId = session.user?.id;
  const unionId = session.user?.unionId;
  const localId = session.user?.localId;
  if (!userId || !unionId) return [];
  if (!isPostgresConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("Acceptance status requires Postgres");
    return [];
  }
  return withRlsContext({ userId, unionId, localId, mfaVerified: Boolean(session.user.mfaVerified) }, async () => {
    const db = getDb();
    const effectiveVersion = sql<number>`CASE
      WHEN ${publicDocuments.status} = 'scheduled' AND ${publicDocuments.publishAt} > now() THEN ${publicDocuments.publishedVersion}
      WHEN ${publicDocuments.status} = 'scheduled' THEN COALESCE(${publicDocuments.scheduledVersion}, ${publicDocuments.currentVersion})
      ELSE COALESCE(${publicDocuments.publishedVersion}, ${publicDocuments.currentVersion})
    END`;
    const docs = await db.select({ slug: publicDocuments.slug, publishAt: publicDocuments.publishAt, status: publicDocuments.status, archivedAt: publicDocuments.archivedAt, version: publicDocumentVersions })
      .from(publicDocuments)
      .innerJoin(publicDocumentVersions, and(eq(publicDocumentVersions.documentId, publicDocuments.id), eq(publicDocumentVersions.version, effectiveVersion)))
      .where(or(eq(publicDocuments.status, "published"), eq(publicDocuments.status, "scheduled")));
    const now = new Date();
    const requirements = docs.flatMap(({ slug, publishAt, status, archivedAt, version }) => {
      if (archivedAt || (status === "published" && publishAt && publishAt > now) || (status === "scheduled" && (!publishAt || publishAt > now) && !version)) return [];
      const payload = version.payload;
      const effective = payload.effectiveAt ? new Date(payload.effectiveAt) : publishAt;
      if (payload.requiresAcceptance !== true || !effective || effective > now) return [];
      return [{ slug, title: payload.title[locale === "fr" ? "fr" : "en"], versionId: version.id, requiresAcceptance: true as const }];
    });
    if (!requirements.length) return [];
    const subjects = [and(eq(publicDocumentAcceptances.subjectType, "individual"), eq(publicDocumentAcceptances.subjectId, userId))!, and(eq(publicDocumentAcceptances.subjectType, "union"), eq(publicDocumentAcceptances.subjectId, unionId))!];
    if (localId) subjects.push(and(eq(publicDocumentAcceptances.subjectType, "local"), eq(publicDocumentAcceptances.subjectId, localId))!);
    const accepted = await db.select({ versionId: publicDocumentAcceptances.documentVersionId })
      .from(publicDocumentAcceptances)
      .where(and(
        or(...requirements.map((requirement) => eq(publicDocumentAcceptances.documentVersionId, requirement.versionId)))!,
        or(...subjects)!,
      ));
    const acceptedIds = new Set(accepted.map((row) => row.versionId));
    return requirements.filter((requirement) => !acceptedIds.has(requirement.versionId));
  });
}
