import { and, eq, or, sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { publicDocuments, publicDocumentVersions, publicDocumentAcceptances } from "@/lib/db/schema";
import { withRlsContext } from "@/lib/db/rls-context";
import { isApprovedPublicPolicy, isPublicDocumentPayload } from "./visibility";

export type AcceptanceScope = "individual" | "organization";
export type AcceptanceSubject = "individual" | "union" | "local";
export type AcceptanceRequirement = { slug: string; title: string; versionId: string; requiresAcceptance: true; acceptanceScope: AcceptanceScope };
export type AcceptanceEvidence = { subjectType: AcceptanceSubject; subjectId: string };

/** Personal policy acceptance is not a privileged action; organization acceptance is. */
export function acceptanceRequiresVerifiedMfa(scope: AcceptanceScope): boolean {
  return scope === "organization";
}

/** Legacy payloads omit scope; malformed explicit values fail closed to organization scope. */
export function resolveAcceptanceScope(scope: unknown): AcceptanceScope {
  return scope === undefined || scope === "individual" ? "individual" : "organization";
}

/** An individual can satisfy only a personal obligation; organization evidence must match its current party. */
export function acceptanceSatisfiesRequirement(requirement: AcceptanceRequirement, evidence: AcceptanceEvidence, identity: { userId: string; unionId?: string; localId?: string }): boolean {
  if (requirement.acceptanceScope === "individual") return evidence.subjectType === "individual" && evidence.subjectId === identity.userId;
  if (evidence.subjectType === "union") return Boolean(identity.unionId && evidence.subjectId === identity.unionId);
  if (evidence.subjectType === "local") return Boolean(identity.localId && evidence.subjectId === identity.localId);
  return false;
}

/** Returns only the current, effective publication versions this identity has not accepted. */
export async function outstandingDocumentAcceptances(session: Session, locale = "en"): Promise<AcceptanceRequirement[]> {
  const userId = session.user?.id;
  const unionId = session.user?.unionId;
  const localId = session.user?.localId;
  if (!userId) return [];
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
      if (!isPublicDocumentPayload(payload) || !isApprovedPublicPolicy(payload)) return [];
      const effective = payload.effectiveAt ? new Date(payload.effectiveAt) : publishAt;
      if (payload.requiresAcceptance !== true || !effective || effective > now) return [];
      return [{ slug, title: payload.title[locale === "fr" ? "fr" : "en"], versionId: version.id, requiresAcceptance: true as const, acceptanceScope: resolveAcceptanceScope(payload.acceptanceScope) }];
    });
    if (!requirements.length) return [];
    const subjects = [and(eq(publicDocumentAcceptances.subjectType, "individual"), eq(publicDocumentAcceptances.subjectId, userId))!];
    if (unionId) subjects.push(and(eq(publicDocumentAcceptances.subjectType, "union"), eq(publicDocumentAcceptances.subjectId, unionId))!);
    if (localId) subjects.push(and(eq(publicDocumentAcceptances.subjectType, "local"), eq(publicDocumentAcceptances.subjectId, localId))!);
    const accepted = await db.select({ versionId: publicDocumentAcceptances.documentVersionId, subjectType: publicDocumentAcceptances.subjectType, subjectId: publicDocumentAcceptances.subjectId })
      .from(publicDocumentAcceptances)
      .where(and(or(...requirements.map((requirement) => eq(publicDocumentAcceptances.documentVersionId, requirement.versionId)))!, or(...subjects)!));
    return requirements.filter((requirement) => !accepted.some((row) => row.versionId === requirement.versionId && acceptanceSatisfiesRequirement(requirement, { subjectType: row.subjectType, subjectId: row.subjectId }, { userId, unionId, localId })));
  });
}
