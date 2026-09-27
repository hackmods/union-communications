import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { auditLog } from "@/lib/audit/store";
import { getDb } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { locals, publicDocumentAcceptances, unions } from "@/lib/db/schema";
import { acceptanceRequiresVerifiedMfa, currentOrganizationAcceptanceStatuses, outstandingDocumentAcceptances } from "@/lib/public-documents/acceptance-gate";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const locale = new URL(request.url).searchParams.get("locale") === "fr" ? "fr" : "en";
  const actor = await resolveAuthorizationActor(session);
  const requirements = await outstandingDocumentAcceptances(session, locale);
  const allowedScopes = ["individual", ...(session.user.mfaVerified && actor.roles.includes("union_admin") ? ["union"] : []), ...(session.user.mfaVerified && session.user.localId && actor.assignments.some((assignment) => assignment.localId === session.user.localId && ["president", "vice_president"].includes(assignment.position)) ? ["local"] : [])];
  const partyScopes = allowedScopes.filter((scope): scope is "union" | "local" => scope === "union" || scope === "local");
  const partyAcceptances = await currentOrganizationAcceptanceStatuses(session, partyScopes, locale);
  return NextResponse.json({ requirements, allowedScopes, partyAcceptances }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { slug?: string; subjectType?: string; authorityAttestation?: boolean } | null;
  if (!body?.slug || !["individual", "union", "local"].includes(body.subjectType ?? "")) return NextResponse.json({ error: "slug and a valid subjectType are required" }, { status: 400 });
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) return NextResponse.json({ error: "Session expired" }, { status: 401 });
  const requirements = await outstandingDocumentAcceptances(session);
  const target = requirements.find((item) => item.slug === body.slug);
  if (!target) return NextResponse.json({ error: "No current acceptance is pending for that document" }, { status: 409 });
  if (acceptanceRequiresVerifiedMfa(target.acceptanceScope) && !session.user.mfaVerified) return NextResponse.json({ error: "MFA required for organization acceptance" }, { status: 403 });
  const type = body.subjectType as "individual" | "union" | "local";
  if ((target.acceptanceScope === "individual" && type !== "individual") || (target.acceptanceScope === "organization" && type === "individual")) return NextResponse.json({ error: "Acceptance subject does not match the published requirement" }, { status: 400 });
  if (target.acceptanceScope === "organization" && body.authorityAttestation !== true) return NextResponse.json({ error: "Confirm your authority to accept for this organization" }, { status: 400 });
  let subjectId = session.user.id;
  if (type === "union") {
    if (!actor.roles.includes("union_admin") || !session.user.unionId || actor.unionId !== session.user.unionId) return NextResponse.json({ error: "Only a union administrator may accept for their own union" }, { status: 403 });
    subjectId = session.user.unionId;
  }
  if (type === "local") {
    const localId = session.user.localId;
    const authorized = Boolean(localId && session.user.unionId && actor.assignments.some((assignment) => assignment.unionId === session.user.unionId && assignment.localId === localId && ["president", "vice_president"].includes(assignment.position)));
    if (!authorized || !localId) return NextResponse.json({ error: "Only the current local president or vice-president may accept for this local" }, { status: 403 });
    subjectId = localId;
  }
  let partyUnavailable = false;
  await withRlsContext({ userId: session.user.id, unionId: session.user.unionId, localId: session.user.localId, mfaVerified: Boolean(session.user.mfaVerified) }, async () => {
    const db = getDb();
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
    const requestId = randomUUID();
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
  if (partyUnavailable) return NextResponse.json({ error: "The contracting party is unavailable" }, { status: 409 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
