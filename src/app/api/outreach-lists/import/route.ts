import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { assertEnterpriseEmailCapability } from "@/lib/email/enterprise-gates";
import {
  importOutreachSubscribers,
  parseOutreachImportCsv,
} from "@/lib/email/outreach-import";
import type { UserRole } from "@/types/tenant";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  listId: z.string().uuid(),
  csv: z.string().min(1).max(2_000_000),
  dryRun: z.boolean().default(false),
  attestation: z.string().min(20).max(2000),
  mfaCode: z.string().max(32).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.unionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sessionMfaOk(session)) {
    return NextResponse.json({ error: "MFA required" }, { status: 403 });
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!roles.includes("union_admin") && !roles.includes("platform_admin")) {
    return NextResponse.json({ error: "Union admin required" }, { status: 403 });
  }
  const gate = await assertEnterpriseEmailCapability(
    "outreach_lists",
    session.user.unionId,
  );
  if (!gate.ok) {
    return NextResponse.json({ error: "Outreach lists disabled" }, { status: 403 });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid import body" }, { status: 400 });
  }
  const stepUp = await verifyFreshMfaStepUp({
    userId: session.user.id,
    code: parsed.data.mfaCode,
  });
  if (!stepUp.ok) {
    return NextResponse.json(
      { error: stepUp.code, stepUpRequired: stepUp.code === "required" },
      { status: stepUp.status },
    );
  }
  const rows = parseOutreachImportCsv(parsed.data.csv);
  if (!rows.length) {
    return NextResponse.json({ error: "No valid rows in CSV" }, { status: 400 });
  }
  const { requestId, responseHeaders } = createAuditRequestContext();
  const result = await importOutreachSubscribers({
    unionId: session.user.unionId,
    listId: parsed.data.listId,
    rows,
    dryRun: parsed.data.dryRun,
    attestation: parsed.data.attestation,
    actorId: session.user.id,
    requestId,
    rls: {
      userId: session.user.id,
      unionId: session.user.unionId,
      crossLocal: true,
      mfaVerified: true,
    },
  });
  if (result === "invalid_attestation") {
    return NextResponse.json({ error: "Attestation required" }, { status: 400 });
  }
  if (result === "list_not_found") {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }
  return NextResponse.json(result, { headers: responseHeaders() });
}
