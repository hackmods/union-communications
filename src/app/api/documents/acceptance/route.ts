import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { getDb } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { locals, publicDocumentAcceptances, publicDocuments, publicDocumentVersions, unions } from "@/lib/db/schema";
import { acceptanceRequiresVerifiedMfa, currentOrganizationAcceptanceStatuses, outstandingDocumentAcceptances } from "@/lib/public-documents/acceptance-gate";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const locale = new URL(request.url).searchParams.get("locale") === "fr" ? "fr" : "en";
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) return NextResponse.json({ error: "Session expired" }, { status: 401 });
  const requirements = await outstandingDocumentAcceptances(session, locale);
  const allowedScopes = ["individual", ...(session.user.mfaVerified && actor.roles.includes("union_admin") ? ["union"] : []), ...(session.user.mfaVerified && session.user.localId && actor.assignments.some((assignment) => assignment.localId === session.user.localId && ["president", "vice_president"].includes(assignment.position)) ? ["local"] : [])];
  const partyScopes = allowedScopes.filter((scope): scope is "union" | "local" => scope === "union" || scope === "local");
  const partyAcceptances = await currentOrganizationAcceptanceStatuses(session, partyScopes, locale);
  return NextResponse.json({ requirements, allowedScopes, partyAcceptances }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const correlation = createAuditRequestContext();
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { slug?: string; subjectType?: string; authorityAttestation?: boolean; mfaCode?: unknown } | null;
  const deny = async (error: string, status: number, reason: string) => {
    const safeSlug = body?.slug && /^[a-z0-9-]{1,80}$/i.test(body.slug) ? body.slug : "unknown";
    const safeSubjectType = body && ["individual", "union", "local"].includes(body.subjectType ?? "")
      ? body.subjectType
      : "unknown";
    await auditLog.log({
      userId: session.user.id,
      action: "document.acceptance.denied",
      resourceType: "public_document_acceptance",
      resourceId: safeSlug,
      unionId: session.user.unionId,
      localId: session.user.localId,
      outcome: "denied",
      requestId: correlation.requestId,
      metadata: {
        requestId: correlation.requestId,
        slug: safeSlug,
        subjectType: safeSubjectType,
        reason,
      },
    });
    return NextResponse.json({ error }, { status, headers: correlation.responseHeaders({ "Cache-Control": "private, no-store" }) });
  };
  if (!body?.slug || !["individual", "union", "local"].includes(body.subjectType ?? "")) return deny("slug and a valid subjectType are required", 400, "invalid_request");
  if (body.mfaCode !== undefined && (typeof body.mfaCode !== "string" || body.mfaCode.length > 32)) return deny("Invalid MFA challenge", 400, "invalid_mfa_challenge");
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) return deny("Session expired", 401, "inactive_account");
  const requirements = await outstandingDocumentAcceptances(session);
  const target = requirements.find((item) => item.slug === body.slug);
  if (!target) return deny("No current acceptance is pending for that document", 409, "no_pending_acceptance");
  if (acceptanceRequiresVerifiedMfa(target.acceptanceScope) && !session.user.mfaVerified) return deny("MFA required for organization acceptance", 403, "session_mfa_required");
  const type = body.subjectType as "individual" | "union" | "local";
  if ((target.acceptanceScope === "individual" && type !== "individual") || (target.acceptanceScope === "organization" && type === "individual")) return deny("Acceptance subject does not match the published requirement", 400, "subject_scope_mismatch");
  if (target.acceptanceScope === "organization" && body.authorityAttestation !== true) return deny("Confirm your authority to accept for this organization", 400, "authority_attestation_required");
  let subjectId = session.user.id;
  if (type === "union") {
    if (!actor.roles.includes("union_admin") || !session.user.unionId || actor.unionId !== session.user.unionId) return deny("Only a union administrator may accept for their own union", 403, "union_authority_required");
    subjectId = session.user.unionId;
  }
  if (type === "local") {
    const localId = session.user.localId;
    const authorized = Boolean(localId && session.user.unionId && actor.assignments.some((assignment) => assignment.unionId === session.user.unionId && assignment.localId === localId && ["president", "vice_president"].includes(assignment.position)));
    if (!authorized || !localId) return deny("Only the current local president or vice-president may accept for this local", 403, "local_authority_required");
    subjectId = localId;
  }
  if (target.acceptanceScope === "organization") {
    const stepUp = await verifyFreshMfaStepUp({ userId: session.user.id, code: body.mfaCode as string | undefined });
    if (!stepUp.ok) {
      await auditLog.log({
        userId: session.user.id,
        action: "document.acceptance.step_up",
        resourceType: "public_document_version",
        resourceId: target.versionId,
        unionId: session.user.unionId,
        localId: session.user.localId,
        outcome: stepUp.outcome,
        requestId: correlation.requestId,
        metadata: { requestId: correlation.requestId, slug: target.slug, subjectType: type, subjectId, reason: stepUp.code },
      });
      return NextResponse.json(
        { error: stepUp.code === "required" ? "A fresh MFA challenge is required" : stepUp.code === "unavailable" ? "MFA verification is unavailable" : stepUp.code === "limited" ? "Too many MFA attempts; try again later" : "MFA verification failed", code: stepUp.code },
        { status: stepUp.status, headers: correlation.responseHeaders({ "Cache-Control": "private, no-store" }) },
      );
    }
  }
  let partyUnavailable = false;
  let staleVersion = false;
  const requestId = correlation.requestId;
  await withRlsContext({ userId: session.user.id, unionId: session.user.unionId, localId: session.user.localId, mfaVerified: Boolean(session.user.mfaVerified) }, async () => {
    const db = getDb();
    const [documentHead] = await db.select().from(publicDocuments)
      .where(eq(publicDocuments.slug, target.slug)).for("share").limit(1);
    let effectiveVersion: number | null = null;
    const now = new Date();
    if (documentHead && !documentHead.archivedAt) {
      if (documentHead.status === "published" && (!documentHead.publishAt || documentHead.publishAt <= now)) {
        effectiveVersion = documentHead.publishedVersion ?? documentHead.currentVersion;
      } else if (documentHead.status === "scheduled" && documentHead.publishAt && documentHead.publishAt > now) {
        effectiveVersion = documentHead.publishedVersion;
      } else if (documentHead.status === "scheduled") {
        effectiveVersion = documentHead.scheduledVersion ?? documentHead.currentVersion;
      }
    }
    let effectiveVersionId: string | null = null;
    if (documentHead && effectiveVersion !== null) {
      const [version] = await db.select({ id: publicDocumentVersions.id }).from(publicDocumentVersions).where(and(
        eq(publicDocumentVersions.documentId, documentHead.id),
        eq(publicDocumentVersions.version, effectiveVersion),
      )).limit(1);
      effectiveVersionId = version?.id ?? null;
    }
    if (!effectiveVersionId || effectiveVersionId !== target.versionId) {
      staleVersion = true;
      return;
    }
    if (type === "union") {
      const [party] = await db.select({ id: unions.id }).from(unions).where(and(
        eq(unions.id, subjectId), isNull(unions.archivedAt),
      )).for("share").limit(1);
      if (!party) { partyUnavailable = true; return; }
    } else if (type === "local") {
      const [party] = await db.select({ id: locals.id }).from(locals).where(and(
        eq(locals.id, subjectId), eq(locals.unionId, session.user.unionId!), isNull(locals.archivedAt),
      )).for("share").limit(1);
      if (!party) { partyUnavailable = true; return; }
    }
    const acceptedAt = new Date();
    const inserted = await db.insert(publicDocumentAcceptances).values({
      id: `pubaccept-${randomUUID()}`, documentVersionId: target.versionId, resourceSlug: target.slug,
      subjectType: type, subjectId, acceptedById: session.user.id, acceptedAt, requestId,
      acceptanceSource: "document_acceptance_page",
      authorityAttested: target.acceptanceScope === "organization",
      authorityAttestationVersion: target.acceptanceScope === "organization" ? "unionops-organization-acceptance-v1" : null,
      authorityAttestedAt: target.acceptanceScope === "organization" ? acceptedAt : null,
    }).onConflictDoNothing().returning({ id: publicDocumentAcceptances.id });
    if (inserted.length) await auditLog.log({ userId: session.user.id, action: "document.acceptance.record", resourceType: "public_document_version", resourceId: target.versionId, unionId: session.user.unionId, localId: session.user.localId, requestId, metadata: { requestId, slug: target.slug, subjectType: type, subjectId, acceptanceScope: target.acceptanceScope, authorityAttested: target.acceptanceScope === "organization" ? "true" : "false" } });
  });
  if (staleVersion) {
    await auditLog.log({
      userId: session.user.id,
      action: "document.acceptance.stale_version",
      resourceType: "public_document_version",
      resourceId: target.versionId,
      unionId: session.user.unionId,
      localId: session.user.localId,
      outcome: "denied",
      requestId,
      metadata: { requestId, slug: target.slug, subjectType: type, subjectId, reason: "publication_changed" },
    });
    return NextResponse.json({ error: "This document version is no longer current. Reload and review the effective version." }, { status: 409, headers: correlation.responseHeaders({ "Cache-Control": "private, no-store" }) });
  }
  if (partyUnavailable) return deny("The contracting party is unavailable", 409, "party_unavailable");
  return NextResponse.json({ ok: true }, { headers: correlation.responseHeaders({ "Cache-Control": "private, no-store" }) });
}
