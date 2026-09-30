import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { assertEnterpriseEmailCapability } from "@/lib/email/enterprise-gates";
import { OUTREACH_LIST_NOTICE } from "@/lib/email/outreach-list-notice";
import {
  createOutreachCampaign,
  createOutreachList,
  listOutreachCampaigns,
  listOutreachLists,
} from "@/lib/email/outreach-lists";
import type { UserRole } from "@/types/tenant";

export const dynamic = "force-dynamic";

function isUnionAdmin(roles: UserRole[]): boolean {
  return roles.includes("union_admin") || roles.includes("platform_admin");
}

async function requireOutreachSession() {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false as const, status: 403 as const, error: "MFA required" };
  }
  if (!session.user.unionId) {
    return { ok: false as const, status: 403 as const, error: "Union required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!isUnionAdmin(roles)) {
    return { ok: false as const, status: 403 as const, error: "Union admin required" };
  }
  const gate = await assertEnterpriseEmailCapability(
    "outreach_lists",
    session.user.unionId,
  );
  if (!gate.ok) {
    return { ok: false as const, status: 403 as const, error: "Outreach lists disabled" };
  }
  return {
    ok: true as const,
    session,
    unionId: session.user.unionId,
    rls: {
      userId: session.user.id,
      unionId: session.user.unionId,
      crossLocal: true,
      mfaVerified: true,
    },
  };
}

export async function GET() {
  const gate = await requireOutreachSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const [lists, campaigns] = await Promise.all([
    listOutreachLists({ unionId: gate.unionId, rls: gate.rls }),
    listOutreachCampaigns({ unionId: gate.unionId, rls: gate.rls }),
  ]);
  return NextResponse.json({ notice: OUTREACH_LIST_NOTICE, lists, campaigns });
}

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().min(2).max(120),
    purpose: z.string().min(2).max(200).optional(),
    slug: z.string().min(2).max(80).optional(),
  }),
  z.object({
    action: z.literal("send"),
    listId: z.string().uuid(),
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(12000),
    release: z.boolean().default(true),
    mfaCode: z.string().max(32).optional(),
  }),
]);

export async function POST(request: Request) {
  const gate = await requireOutreachSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (parsed.data.action === "create") {
    const { requestId, responseHeaders } = createAuditRequestContext();
    const result = await createOutreachList({
      unionId: gate.unionId,
      createdById: gate.session.user.id,
      name: parsed.data.name,
      purpose: parsed.data.purpose,
      slug: parsed.data.slug,
      rls: gate.rls,
    });
    if (!result.ok) {
      const status = result.reason === "gate_closed" ? 403 : 409;
      return NextResponse.json({ error: result.reason }, { status });
    }
    await auditLog.log({
      userId: gate.session.user.id,
      unionId: gate.unionId,
      action: "outreach_list.created",
      resourceType: "outreach_list",
      resourceId: result.listId,
      metadata: { requestId, slug: result.slug },
    });
    return NextResponse.json(
      { ok: true, listId: result.listId, slug: result.slug },
      { headers: responseHeaders() },
    );
  }

  const stepUp = await verifyFreshMfaStepUp({
    userId: gate.session.user.id,
    code: parsed.data.mfaCode,
  });
  if (!stepUp.ok) {
    return NextResponse.json(
      { error: stepUp.code, stepUpRequired: stepUp.code === "required" },
      { status: stepUp.status },
    );
  }
  const { requestId, responseHeaders } = createAuditRequestContext();
  const result = await createOutreachCampaign({
    unionId: gate.unionId,
    listId: parsed.data.listId,
    createdById: gate.session.user.id,
    subject: parsed.data.subject,
    bodyText: parsed.data.body,
    release: parsed.data.release,
    rls: gate.rls,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }
  await auditLog.log({
    userId: gate.session.user.id,
    unionId: gate.unionId,
    action: "outreach_list.campaign.created",
    resourceType: "outreach_campaign",
    resourceId: result.campaignId,
    metadata: { requestId, release: String(parsed.data.release) },
  });
  return NextResponse.json(
    { ok: true, campaignId: result.campaignId },
    { headers: responseHeaders() },
  );
}
